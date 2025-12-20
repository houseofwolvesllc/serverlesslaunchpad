/**
 * Endpoint Route Mapper
 *
 * Maps API endpoint hrefs to React Router paths for navigation after POST actions.
 * Supports pattern matching for dynamic user-specific endpoints.
 */

/**
 * Configuration mapping API endpoints to React Router paths
 * Supports {userId} placeholder for user-specific routes
 */
export const ENDPOINT_ROUTE_MAP: Record<string, string> = {
    // User Account Actions
    '/users/{userId}/api_keys/list': '/account/api-keys',
    '/users/{userId}/sessions/list': '/account/sessions',

    // Admin Actions (future)
    // '/admin/users/list': '/admin/users',

    // Generic fallback - use href as route path
    default: '{href}',
};

/**
 * Map API endpoint href to React Router path
 *
 * Matches endpoint patterns against configured mappings and returns
 * the corresponding React Router path. Handles dynamic segments like {userId}.
 *
 * @param href - API endpoint (e.g., "/users/abc123/api_keys/list")
 * @param method - HTTP method (GET, POST, etc.)
 * @returns React Router path (e.g., "/account/api-keys") or null if no mapping found
 *
 * @example
 * ```typescript
 * mapEndpointToRoute('/users/abc123/api_keys/list', 'POST')
 * // Returns: '/account/api-keys'
 *
 * mapEndpointToRoute('/sitemap', 'GET')
 * // Returns: '/sitemap'
 * ```
 */
export function mapEndpointToRoute(href: string, method: string): string | null {
    // For GET requests, use the href directly as the route
    if (method === 'GET') {
        return href;
    }

    // For POST requests, try to find a mapping
    // First, try exact match
    if (ENDPOINT_ROUTE_MAP[href]) {
        return ENDPOINT_ROUTE_MAP[href];
    }

    // Then, try pattern matching (replace dynamic segments with {userId})
    const normalizedHref = href.replace(/\/users\/[a-f0-9]+\//g, '/users/{userId}/');

    if (ENDPOINT_ROUTE_MAP[normalizedHref]) {
        return ENDPOINT_ROUTE_MAP[normalizedHref];
    }

    // Fallback: use default mapping or return null
    const defaultMapping = ENDPOINT_ROUTE_MAP.default;
    if (defaultMapping === '{href}') {
        return href;
    }

    return null;
}

/**
 * Extract resource name from href for display purposes
 *
 * @param href - API endpoint
 * @returns Human-readable resource name
 *
 * @example
 * ```typescript
 * extractResourceName('/users/abc123/api_keys/list')
 * // Returns: 'API Keys'
 * ```
 */
export function extractResourceName(href: string): string {
    // Extract the resource part (e.g., 'api_keys', 'sessions')
    const match = href.match(/\/([^/]+)\/list$/);
    if (match) {
        const resource = match[1];
        // Convert snake_case to Title Case
        return resource
            .split('_')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    // Fallback: use href
    return href;
}
