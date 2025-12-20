/**
 * Link Navigator Service
 *
 * Provides utilities for navigating HAL hypermedia resources by following links.
 * Implements RFC 6570 URI template expansion for templated links.
 *
 * Framework-agnostic - works in any JavaScript/TypeScript environment.
 *
 * @see https://datatracker.ietf.org/doc/html/draft-kelly-json-hal-11
 * @see https://datatracker.ietf.org/doc/html/rfc6570
 */

import type { HalLink, HalObject } from '@houseofwolves/serverlesslaunchpad.types/hal';

/**
 * Link Navigator Service for traversing HAL resources
 *
 * Pure TypeScript service for navigating HAL hypermedia. Can be used with
 * any framework (React, Svelte, Vue, etc.) or in Node.js.
 *
 * @example
 * ```typescript
 * const navigator = new LinkNavigator();
 *
 * // Find a link
 * const link = navigator.findLink(user, 'sessions');
 *
 * // Get href from link
 * const url = navigator.getHref(user, 'search', { q: 'test', limit: 10 });
 *
 * // Check capabilities
 * const canDelete = navigator.hasCapability(session, 'delete');
 * ```
 */
export class LinkNavigator {
    /**
     * Find a link by relation type in a HAL resource
     * Supports multiple relation types as fallbacks
     *
     * @param resource - The HAL resource to search
     * @param rel - Link relation(s) to find (string or array of strings)
     * @returns The matching link or undefined if not found
     *
     * @example
     * const link = navigator.findLink(user, 'sessions');
     * const link = navigator.findLink(user, ['sessions', 'alternate']);
     */
    findLink(resource: HalObject, rel: string | string[]): HalLink | undefined {
        if (!resource._links) {
            return undefined;
        }

        const rels = Array.isArray(rel) ? rel : [rel];

        for (const r of rels) {
            const link = resource._links[r];
            if (link) {
                // Handle both single link and array of links
                // Return the first link if it's an array
                return Array.isArray(link) ? link[0] : link;
            }
        }

        return undefined;
    }

    /**
     * Get the href from a link relation
     * Convenience method that extracts just the URL
     *
     * @param resource - The HAL resource to search
     * @param rel - Link relation(s) to find
     * @param params - Optional parameters for URI template expansion
     * @returns The href string or undefined if not found
     *
     * @example
     * const url = navigator.getHref(user, 'sessions');
     * const url = navigator.getHref(user, 'search', { q: 'test', limit: 10 });
     */
    getHref(resource: HalObject, rel: string | string[], params?: Record<string, any>): string | undefined {
        const link = this.findLink(resource, rel);

        if (!link) {
            return undefined;
        }

        // If the link is templated, expand it with params
        if (link.templated && params) {
            return this.expandTemplate(link.href, params);
        }

        return link.href;
    }

    /**
     * Check if a resource has a specific capability (link relation)
     * Used for conditional UI rendering based on available actions
     *
     * @param resource - The HAL resource to check
     * @param rel - Link relation(s) to check for
     * @returns True if the link exists
     *
     * @example
     * const canDelete = navigator.hasCapability(session, 'delete');
     * if (canDelete) {
     *   // Show delete button
     * }
     */
    hasCapability(resource: HalObject, rel: string | string[]): boolean {
        return this.findLink(resource, rel) !== undefined;
    }

    /**
     * Expand a URI template (RFC 6570) with parameters
     * Supports simple expansion only (Level 1)
     *
     * @param template - The URI template string
     * @param params - Parameters to substitute
     * @returns The expanded URI
     *
     * @example
     * expandTemplate('/users/{userId}/sessions{?limit,offset}', {
     *   userId: '123',
     *   limit: 10,
     *   offset: 0
     * })
     * // Returns: '/users/123/sessions?limit=10&offset=0'
     */
    expandTemplate(template: string, params: Record<string, any>): string {
        let result = template;

        // Handle path parameters: {paramName}
        result = result.replace(/\{([^}]+)\}/g, (_match, key) => {
            // Check for query parameter prefix
            if (key.startsWith('?')) {
                // This is a query string template, handle separately
                return _match;
            }

            const value = params[key];
            return value !== undefined && value !== null ? encodeURIComponent(String(value)) : _match;
        });

        // Handle query parameters: {?param1,param2,param3}
        result = result.replace(/\{\?([^}]+)\}/g, (_match, keys) => {
            const queryParams = keys.split(',')
                .map((key: string) => key.trim())
                .filter((key: string) => {
                    const value = params[key];
                    return value !== undefined && value !== null;
                })
                .map((key: string) => {
                    const value = params[key];
                    return `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`;
                });

            return queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
        });

        // Handle query parameter continuation: {&param1,param2}
        result = result.replace(/\{&([^}]+)\}/g, (_match, keys) => {
            const queryParams = keys.split(',')
                .map((key: string) => key.trim())
                .filter((key: string) => {
                    const value = params[key];
                    return value !== undefined && value !== null;
                })
                .map((key: string) => {
                    const value = params[key];
                    return `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`;
                });

            return queryParams.length > 0 ? `&${queryParams.join('&')}` : '';
        });

        return result;
    }

    /**
     * Get all links from a resource
     * Useful for debugging or building navigation menus
     *
     * @param resource - The HAL resource
     * @returns Map of relation to link(s)
     */
    getAllLinks(resource: HalObject): Record<string, HalLink | HalLink[]> {
        return resource._links || {};
    }

    /**
     * Check if a link is templated
     *
     * @param link - The link to check
     * @returns True if the link requires template expansion
     */
    isTemplated(link: HalLink): boolean {
        return link.templated === true;
    }

    /**
     * Get link by relation with type safety
     * Returns the link only if it matches the expected type
     *
     * @param resource - The HAL resource
     * @param rel - Link relation to find
     * @param expectedType - Expected media type (e.g., 'application/json')
     * @returns The link if found and type matches
     */
    findLinkByType(resource: HalObject, rel: string, expectedType: string): HalLink | undefined {
        const link = this.findLink(resource, rel);

        if (!link) {
            return undefined;
        }

        // If no type specified on link, assume it matches
        if (!link.type) {
            return link;
        }

        return link.type === expectedType ? link : undefined;
    }

    /**
     * Extract all relation types from a resource
     * Useful for capability discovery
     *
     * @param resource - The HAL resource
     * @returns Array of available link relations
     *
     * @example
     * const capabilities = navigator.getAvailableRelations(user);
     * // Returns: ['self', 'sessions', 'api-keys', 'update', 'delete']
     */
    getAvailableRelations(resource: HalObject): string[] {
        if (!resource._links) {
            return [];
        }

        return Object.keys(resource._links);
    }
}

/**
 * Factory function to create a LinkNavigator instance
 *
 * @returns New LinkNavigator instance
 */
export function createLinkNavigator(): LinkNavigator {
    return new LinkNavigator();
}

/**
 * Singleton instance for convenience
 * Can be used directly or create new instances as needed
 */
export const linkNavigator = new LinkNavigator();
