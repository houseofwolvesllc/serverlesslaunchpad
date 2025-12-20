/**
 * Route Generator Utility
 *
 * Generates dynamic React Router routes from the sitemap API navigation structure.
 *
 * This utility enables HATEOAS-driven routing where:
 * - API sitemap defines available routes
 * - Navigation items are mapped to React components via component registry
 * - Routes are generated dynamically at runtime
 *
 * Key functions:
 * - extractNavigableItems(): Recursively finds items that should have routes
 * - generateRoutesFromSitemap(): Creates RouteObject array for React Router
 * - normalizePathForRouter(): Converts API paths to React Router format
 */

import { RouteObject } from 'react-router-dom';
import { createElement } from 'react';
import { NavigationItem } from '../features/sitemap/utils/transform_navigation';
import { getComponentForId } from './component_registry';
import { logger } from '../logging/logger';

/**
 * Extract all navigable items from sitemap (recursive)
 *
 * Navigable items are those that:
 * - Have an href (target URL)
 * - Are not POST actions (except for collection list endpoints)
 *
 * Special case: POST endpoints ending in "/list" are treated as navigable
 * because they're collection views that use POST for paging (not true actions).
 *
 * This function recursively traverses the navigation tree to find all
 * items that should have corresponding routes.
 *
 * @param items - Sitemap navigation items
 * @returns Flat array of navigable items
 *
 * @example
 * ```typescript
 * const items: NavigationItem[] = [
 *   {
 *     id: 'account',
 *     title: 'Account',
 *     items: [
 *       { id: 'sessions', title: 'Sessions', href: '/users/123/sessions/list', method: 'POST' },
 *       { id: 'logout', title: 'Logout', href: '/logout', method: 'POST' }
 *     ]
 *   }
 * ];
 *
 * const navigable = extractNavigableItems(items);
 * // Returns: [{ id: 'sessions', title: 'Sessions', href: '/users/123/sessions/list', method: 'POST' }]
 * // Note: sessions is included (ends with /list), logout is excluded (true action)
 * ```
 */
export function extractNavigableItems(items: NavigationItem[]): NavigationItem[] {
    const navigable: NavigationItem[] = [];

    function traverse(items: NavigationItem[]) {
        for (const item of items) {
            // Include item if it has href and either:
            // 1. Not a POST method, OR
            // 2. Is a POST method but ends with /list (collection view)
            if (item.href && (item.method !== 'POST' || item.href.endsWith('/list'))) {
                navigable.push(item);
            }

            // Recursively traverse nested items
            if (item.items) {
                traverse(item.items);
            }
        }
    }

    traverse(items);
    return navigable;
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
 * Generate route objects from sitemap navigation items
 *
 * Maps navigation items to React Router route objects using component registry.
 * Items without registered components are logged but skipped (graceful degradation).
 *
 * This is the core function that enables dynamic routing:
 * 1. Extracts navigable items from sitemap
 * 2. Looks up corresponding component for each item
 * 3. Creates RouteObject with normalized path and component element
 * 4. Handles missing components gracefully with console warnings
 *
 * @param items - Sitemap navigation items
 * @returns Array of RouteObject for React Router
 *
 * @example
 * ```typescript
 * const sitemapItems: NavigationItem[] = [
 *   {
 *     id: 'account',
 *     title: 'Account',
 *     items: [
 *       { id: 'sessions', title: 'Sessions', href: '/users/123/sessions/list' },
 *       { id: 'api-keys', title: 'API Keys', href: '/users/123/api-keys/list' }
 *     ]
 *   }
 * ];
 *
 * const routes = generateRoutesFromSitemap(sitemapItems);
 * // Returns: [
 * //   { path: 'users/123/sessions/list', element: <SessionsList /> },
 * //   { path: 'users/123/api-keys/list', element: <ApiKeysList /> }
 * // ]
 * ```
 */
export function generateRoutesFromSitemap(items: NavigationItem[]): RouteObject[] {
    // Extract navigable items (has href, not POST)
    const navigable = extractNavigableItems(items);

    // Map to route objects
    const routes: RouteObject[] = [];

    for (const item of navigable) {
        const Component = getComponentForId(item.id);

        if (!Component) {
            // Log warning but don't fail - graceful degradation
            logger.warn('No component registered for navigation id', {
                context: 'Dynamic Routing',
                navigationId: item.id,
                href: item.href,
            });
            continue;
        }

        // Normalize path (remove leading slash for nested routes)
        const path = normalizePathForRouter(item.href!);

        routes.push({
            path,
            element: createElement(Component),
        });
    }

    return routes;
}
