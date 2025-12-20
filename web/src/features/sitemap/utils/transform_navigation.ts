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

import { getIcon } from './icon_mapper';
import type { Icon } from '@tabler/icons-react';
import { createPostActionHandler } from './navigation_actions';
import type { NavigateFunction } from 'react-router-dom';

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
    icon: Icon;
    label: string;
    initiallyOpened?: boolean;
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
export function transformNavigationItem(
    item: NavigationItem,
    userContext?: UserContext
): LinksGroupProps | null {
    // Filter based on role
    if (!shouldIncludeItem(item, userContext?.role)) {
        return null;
    }

    // Get icon component
    const icon = getIcon(item.icon);

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
                    childItem.method === 'POST' && href
                        ? createPostActionHandler(href, childItem.title)
                        : undefined;

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
export function transformNavigationItems(
    items: NavigationItem[],
    userContext?: UserContext
): LinksGroupProps[] {
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
export function createFallbackNavigation(userContext?: UserContext): LinksGroupProps[] {
    const navigation: LinksGroupProps[] = [
        {
            icon: getIcon('home'),
            label: 'Home',
            links: undefined,
        },
    ];

    // Add user-specific items if authenticated
    if (userContext?.userId) {
        navigation.push({
            icon: getIcon('user'),
            label: 'Profile',
            links: [
                { label: 'My Sessions', link: `/users/${userContext.userId}/sessions` },
                { label: 'My API Keys', link: `/users/${userContext.userId}/api_keys` },
            ],
        });
    }

    return navigation;
}
