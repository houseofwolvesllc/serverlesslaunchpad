/**
 * Route Generator Utility
 *
 * Generates dynamic React Router routes from the sitemap API navigation structure.
 *
 * This utility enables HATEOAS-driven routing where:
 * - API sitemap defines available routes
 * - Navigation items are mapped to React components via component registry
 * - Routes are generated dynamically at runtime
 * - Parent chain is preserved for breadcrumb generation
 *
 * Key functions:
 * - generateRoutesFromNavStructure(): Creates RouteObject array from hierarchical nav
 * - normalizePathForRouter(): Converts API paths to React Router format
 */

import { RouteObject } from 'react-router-dom';
import { createElement } from 'react';
import type { NavItem, NavGroup, ResolvedNavItem } from '../hooks/use_navigation';
import { getComponentForId } from './component_registry';
import { logger } from '../logging/logger';

/**
 * Breadcrumb metadata for a route
 */
export interface BreadcrumbMeta {
    /** Display label for breadcrumb */
    label: string;
    /** Path for clickable breadcrumb (null if not clickable - e.g., groups or current page) */
    path: string | null;
    /** Parent chain of breadcrumb items */
    parentChain: BreadcrumbMeta[];
    /** Whether this represents a group (non-clickable parent) */
    isGroup: boolean;
}

/**
 * HAL link structure
 */
interface HalLink {
    href: string;
    title?: string;
    [key: string]: any;
}

/**
 * HAL template structure
 */
interface HalTemplate {
    title: string;
    method: string;
    target: string;
    [key: string]: any;
}

/**
 * Resolve a navigation item to its actual link or template
 *
 * @param item - Navigation item to resolve
 * @param links - HAL links from sitemap
 * @param templates - HAL templates from sitemap
 * @returns Resolved item with actual data, or null if not found
 */
function resolveNavItem(
    item: NavItem,
    links: Record<string, HalLink>,
    templates: Record<string, HalTemplate>
): ResolvedNavItem | null {
    if (item.type === 'link') {
        const link = links[item.rel];
        if (!link) return null;

        return {
            href: link.href,
            title: item.title || link.title || item.rel,
            type: 'link',
        };
    } else {
        const template = templates[item.rel];
        if (!template) return null;

        return {
            href: template.target,
            title: item.title || template.title || item.rel,
            type: 'template',
            method: template.method,
            template,
        };
    }
}

/**
 * Normalize path for React Router
 *
 * Converts absolute paths from API to relative paths for nested routes.
 * React Router expects relative paths when used inside parent routes.
 *
 * @param href - Absolute path from API (e.g., "/users/123/sessions/list")
 * @returns Relative path for React Router (e.g., "users/123/sessions/list")
 *
 * @example
 * ```typescript
 * normalizePathForRouter('/users/123/sessions');
 * // Returns: 'users/123/sessions'
 *
 * normalizePathForRouter('users/123/sessions');
 * // Returns: 'users/123/sessions'
 * ```
 */
export function normalizePathForRouter(href: string): string {
    // Remove leading slash for nested routes
    return href.startsWith('/') ? href.slice(1) : href;
}

/**
 * Generate route objects from hierarchical navigation structure
 *
 * Recursively traverses NavGroups and NavItems to generate React Router routes.
 * Tracks parent chain for breadcrumb generation.
 *
 * @param navStructure - Hierarchical navigation from API (_nav)
 * @param links - HAL links from sitemap
 * @param templates - HAL templates from sitemap
 * @returns Array of RouteObject for React Router
 *
 * @example
 * ```typescript
 * const routes = generateRoutesFromNavStructure(
 *   navStructure,
 *   { users: { href: '/users' } },
 *   { create: { title: 'Create', method: 'POST', target: '/users' } }
 * );
 * ```
 */
export function generateRoutesFromNavStructure(
    navStructure: (NavItem | NavGroup)[],
    links: Record<string, HalLink>,
    templates: Record<string, HalTemplate>,
    parentChain: BreadcrumbMeta[] = []
): RouteObject[] {
    const routes: RouteObject[] = [];

    for (const item of navStructure) {
        // Handle NavGroup - recursive traversal
        if ('title' in item && 'items' in item) {
            const group = item as NavGroup;

            // Groups don't have routes themselves, but contribute to breadcrumb chain
            const groupMeta: BreadcrumbMeta = {
                label: group.title,
                path: null, // Groups are not clickable
                parentChain: [...parentChain],
                isGroup: true,
            };

            // Recursively process children with updated parent chain
            const childRoutes = generateRoutesFromNavStructure(
                group.items,
                links,
                templates,
                [...parentChain, groupMeta]
            );

            routes.push(...childRoutes);
            continue;
        }

        // Handle NavItem - resolve and create route
        const navItem = item as NavItem;
        const resolved = resolveNavItem(navItem, links, templates);

        if (!resolved) {
            logger.warn('Could not resolve navigation item', {
                context: 'Route Generation',
                rel: navItem.rel,
                type: navItem.type,
            });
            continue;
        }

        // Skip POST actions unless they end with /list (collection views)
        if (resolved.method === 'POST' && !resolved.href.endsWith('/list')) {
            continue;
        }

        // Use rel as component ID (semantic identifier like 'my-profile', 'sessions', 'api-keys')
        // This works for template URLs with path parameters like /users/{userId}
        const componentId = navItem.rel;
        const Component = getComponentForId(componentId);

        // Skip navigation items without registered components (gracefully handle unimplemented routes)
        if (!Component) {
            continue;
        }

        // Create breadcrumb metadata for this route
        const routeMeta: BreadcrumbMeta = {
            label: resolved.title,
            path: resolved.href,
            parentChain: [...parentChain],
            isGroup: false,
        };

        // Normalize path and create route
        const path = normalizePathForRouter(resolved.href);

        routes.push({
            path,
            element: createElement(Component),
            handle: routeMeta, // Attach breadcrumb metadata
        });
    }

    return routes;
}
