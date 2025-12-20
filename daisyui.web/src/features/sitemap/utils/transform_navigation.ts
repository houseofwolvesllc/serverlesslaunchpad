/**
 * Navigation Transformation Utility
 *
 * Transforms NavigationItem[] from the API sitemap into LinksGroupProps[]
 * for rendering with the LinksGroup component.
 *
 * Handles:
 * - Icon mapping from strings to React components
 * - Nested navigation structures
 * - Templated URI expansion
 * - Role-based filtering
 */

import type { LucideIcon } from 'lucide-react';
import type { NavigateFunction } from 'react-router-dom';
import type { NavGroup, NavItem, ResolvedNavItem } from '../../../hooks/use_navigation';
import { getIcon } from './icon_mapper';
import { createPostActionHandler } from './navigation_actions';

/**
 * Navigation item structure from the API
 */
export interface NavigationItem {
    id: string;
    title: string;
    href?: string;
    method?: string;
    templated?: boolean;
    description?: string;
    icon?: string;
    requiresRole?: string;
    items?: NavigationItem[];
}

/**
 * Props for the LinksGroup component
 */
export interface LinksGroupProps {
    icon: LucideIcon;
    label: string;
    initiallyOpened?: boolean;
    link?: string;
    newTab?: boolean;
    links?: { label: string; link?: string; onClick?: (navigate: NavigateFunction) => Promise<void> }[];
}

/**
 * User context for template expansion and role filtering
 */
export interface UserContext {
    userId?: string;
    role?: string;
}

/**
 * Template expansion parameters
 */
export interface TemplateParams {
    [key: string]: string | number | undefined;
}

/**
 * Expand templated URIs with provided parameters
 *
 * Supports simple {variable} template syntax
 *
 * @param href - The templated URI (e.g., "/users/{userId}/sessions")
 * @param params - Parameters for expansion (e.g., { userId: "123" })
 * @returns The expanded URI (e.g., "/users/123/sessions")
 *
 * @example
 * ```typescript
 * expandTemplatedUri('/users/{userId}/sessions', { userId: '123' });
 * // Returns: '/users/123/sessions'
 * ```
 */
export function expandTemplatedUri(href: string, params: TemplateParams): string {
    return href.replace(/\{(\w+)\}/g, (match, key) => {
        const value = params[key];
        return value !== undefined ? String(value) : match;
    });
}

/**
 * Check if a navigation item should be included based on user role
 *
 * @param item - The navigation item to check
 * @param userRole - The current user's role
 * @returns True if the item should be included, false otherwise
 */
export function shouldIncludeItem(item: NavigationItem, userRole?: string): boolean {
    // If no role requirement, always include
    if (!item.requiresRole) {
        return true;
    }

    // If no user role provided, exclude items with role requirements
    if (!userRole) {
        return false;
    }

    // Simple role matching (can be enhanced with role hierarchy later)
    return item.requiresRole === userRole || userRole === 'Admin';
}

/**
 * Transform a single navigation item into LinksGroupProps
 *
 * @param item - The navigation item from the API
 * @param userContext - User context for template expansion and role filtering
 * @returns Transformed LinksGroupProps, or null if item should be filtered out
 */
export function transformNavigationItem(item: NavigationItem, userContext?: UserContext): LinksGroupProps | null {
    // Filter based on role
    if (!shouldIncludeItem(item, userContext?.role)) {
        return null;
    }

    // Get icon component
    const icon = getIcon(item.icon);

    // Handle parent-level href
    let parentLink: string | undefined = undefined;
    if (item.href) {
        parentLink = item.href;

        // Expand templated URIs for parent
        if (item.templated && userContext?.userId) {
            parentLink = expandTemplatedUri(parentLink, {
                userId: userContext.userId,
            });
        }
    }

    // Transform child items if present
    let links:
        | Array<{ label: string; link?: string; onClick?: (navigate: NavigateFunction) => Promise<void> }>
        | undefined = undefined;

    if (item.items) {
        const childLinks = item.items
            .filter((childItem) => shouldIncludeItem(childItem, userContext?.role))
            .map((childItem) => {
                let href = childItem.href;

                // Expand templated URIs
                if (href && childItem.templated && userContext?.userId) {
                    href = expandTemplatedUri(href, {
                        userId: userContext.userId,
                    });
                }

                // Create onClick handler for POST methods
                const onClick =
                    childItem.method === 'POST' && href ? createPostActionHandler(href, childItem.title) : undefined;

                return {
                    label: childItem.title,
                    link: href,
                    onClick,
                };
            });

        links = childLinks.length > 0 ? childLinks : undefined;
    }

    return {
        icon,
        label: item.title,
        initiallyOpened: false, // Can be made configurable later
        link: parentLink,
        newTab: false, // API sitemap items never open in new tab
        links,
    };
}

/**
 * Transform an array of navigation items into LinksGroupProps array
 *
 * @param items - Array of navigation items from the API
 * @param userContext - User context for template expansion and role filtering
 * @returns Array of transformed LinksGroupProps
 *
 * @example
 * ```typescript
 * const apiNavigation: NavigationItem[] = [
 *   {
 *     id: 'users',
 *     title: 'User Management',
 *     icon: 'users',
 *     items: [
 *       { id: 'sessions', title: 'Sessions', href: '/users/{userId}/sessions', templated: true }
 *     ]
 *   }
 * ];
 *
 * const navProps = transformNavigationItems(apiNavigation, { userId: '123' });
 * // Returns: [{ icon: IconUsers, label: 'User Management', links: [{ label: 'Sessions', link: '/users/123/sessions' }] }]
 * ```
 */
export function transformNavigationItems(items: NavigationItem[], userContext?: UserContext): LinksGroupProps[] {
    return items
        .map((item) => transformNavigationItem(item, userContext))
        .filter((item): item is LinksGroupProps => item !== null);
}

/**
 * Create fallback navigation for error states
 *
 * Returns a minimal set of navigation items when the API is unavailable
 *
 * @param userContext - User context for personalization
 * @returns Minimal fallback navigation
 */
export function createFallbackNavigation(_userContext?: UserContext): LinksGroupProps[] {
    const navigation: LinksGroupProps[] = [
        {
            icon: getIcon('home'),
            label: 'Home',
            link: '/',
            newTab: false,
            links: undefined,
        },
    ];

    return navigation;
}

/**
 * Transform HAL _nav structure to LinksGroupProps array
 *
 * Converts the new hierarchical NavGroup[] structure from the API into
 * the LinksGroupProps[] format expected by the LinksGroup component.
 *
 * Prepends hardcoded static navigation items (Home, API Documentation) that are
 * managed by the web client, not the API sitemap.
 *
 * @param navGroups - NavGroup array from API's _nav property
 * @param resolveItem - Function to resolve NavItem refs to actual links/templates
 * @returns Array of LinksGroupProps ready for rendering
 */
export function transformNavStructure(
    nav: (NavItem | NavGroup)[],
    resolveItem: (item: NavItem) => ResolvedNavItem | null
): LinksGroupProps[] {
    const result: LinksGroupProps[] = [];

    for (const item of nav) {
        // Handle root-level NavItems
        if ('rel' in item) {
            const navItem = item as NavItem;
            const resolved = resolveItem(navItem);

            if (!resolved) continue;

            const icon = getIcon(navItem.rel);

            result.push({
                icon,
                label: resolved.title,
                link: resolved.type === 'link' ? resolved.href : undefined,
                newTab: resolved.href?.startsWith('http'), // Open external links in new tab
                // Template items get onClick handler
                links:
                    resolved.type === 'template' && resolved.method === 'POST'
                        ? [
                              {
                                  label: resolved.title,
                                  link: resolved.href,
                                  onClick: createPostActionHandler(resolved.href, resolved.title),
                              },
                          ]
                        : undefined,
            });
            continue;
        }

        // Handle NavGroups
        const group = item as NavGroup;
        // Handle single-item groups (flatten to single LinksGroupProps)
        if (group.items.length === 1 && 'rel' in group.items[0]) {
            const navItem = group.items[0] as NavItem;
            const resolved = resolveItem(navItem);

            if (!resolved) continue;

            // Map icon based on rel key
            const icon = getIcon(navItem.rel);

            result.push({
                icon,
                label: resolved.title,
                link: resolved.type === 'link' ? resolved.href : undefined,
                newTab: false,
                // Template items get onClick handler
                links:
                    resolved.type === 'template' && resolved.method === 'POST'
                        ? [
                              {
                                  label: resolved.title,
                                  link: resolved.href,
                                  onClick: createPostActionHandler(resolved.href, resolved.title),
                              },
                          ]
                        : undefined,
            });
        }
        // Handle multi-item groups
        else {
            // For groups with multiple items, we need a parent icon
            // Use the first item's rel for icon, or default to the group title
            const firstNavItem = group.items.find((item) => 'rel' in item) as NavItem | undefined;
            const icon = firstNavItem ? getIcon(firstNavItem.rel) : getIcon(group.title.toLowerCase());

            // Transform child items
            const childLinks: Array<{
                label: string;
                link?: string;
                onClick?: (navigate: NavigateFunction) => Promise<void>;
            }> = [];

            for (const item of group.items) {
                if ('rel' in item) {
                    // NavItem - resolve to link/template
                    const navItem = item as NavItem;
                    const resolved = resolveItem(navItem);

                    if (!resolved) continue;

                    if (resolved.type === 'template' && resolved.method === 'POST') {
                        childLinks.push({
                            label: resolved.title,
                            link: resolved.href,
                            onClick: createPostActionHandler(resolved.href, resolved.title),
                        });
                    } else {
                        childLinks.push({
                            label: resolved.title,
                            link: resolved.href,
                        });
                    }
                } else {
                    // Nested NavGroup - recursively transform
                    const nestedGroup = item as NavGroup;
                    const nestedTransformed = transformNavStructure([nestedGroup], resolveItem);

                    // Flatten nested group items into child links
                    for (const nested of nestedTransformed) {
                        if (nested.link) {
                            childLinks.push({
                                label: nested.label,
                                link: nested.link,
                            });
                        } else if (nested.links) {
                            childLinks.push(...nested.links);
                        }
                    }
                }
            }

            if (childLinks.length > 0) {
                result.push({
                    icon,
                    label: group.title,
                    newTab: false,
                    links: childLinks,
                });
            }
        }
    }

    return result;
}
