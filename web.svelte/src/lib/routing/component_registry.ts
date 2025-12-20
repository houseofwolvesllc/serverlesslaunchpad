/**
 * Component Registry
 *
 * Maps sitemap navigation IDs to Svelte components for dynamic routing.
 *
 * Registry Pattern:
 * - Key: sitemap navigation item `rel` field
 * - Value: Svelte component to render for that route
 *
 * The registry enables the generic catch-all route to dynamically render
 * dedicated feature components (with bulk operations, custom renderers, etc.)
 * when accessing known resource types, while falling back to the generic
 * HalCollectionList/HalResourceDetail for unknown resources.
 *
 * To add a new API resource with dedicated component:
 * 1. Create Svelte component in routes/(app)/ or lib/components/
 * 2. Register component here with matching `rel` from sitemap
 * 3. Component will be rendered instead of generic view
 */

import type { Component, SvelteComponent } from 'svelte';

/**
 * Registry entry with component and optional URL patterns
 */
export interface RegistryEntry {
	/** Svelte component to render */
	component: Component<any>;
	/** URL patterns that match this component (regex or string) */
	patterns?: (string | RegExp)[];
}

/**
 * Component registry mapping sitemap navigation `rel` values to Svelte components
 *
 * Keys are sitemap navigation item `rel` values (e.g., 'sessions', 'api-keys')
 * This matches the React component_registry.ts pattern.
 *
 * NOTE: Components are lazy-loaded to avoid circular imports and improve
 * initial load performance.
 */
export const componentRegistry: Record<string, RegistryEntry> = {
	// User resources - lazy loaded
	sessions: {
		component: null as unknown as Component<any>, // Populated dynamically
		patterns: [/\/sessions\/list$/, /^\/sessions$/]
	},
	'api-keys': {
		component: null as unknown as Component<any>, // Populated dynamically
		patterns: [/\/api-keys\/list$/, /^\/api-keys$/]
	}

	// Add new components here as API resources are added
	// Example:
	// 'webhooks': {
	//     component: WebhooksList,
	//     patterns: [/\/webhooks\/list$/, /^\/webhooks$/]
	// },
};

/**
 * Get the component for a given navigation `rel` value
 *
 * @param rel - Navigation item `rel` from sitemap
 * @returns Registry entry with component, or null if no mapping exists
 *
 * @example
 * ```typescript
 * const entry = getComponentForRel('sessions');
 * if (entry) {
 *   // Render entry.component
 * }
 * ```
 */
export function getComponentForRel(rel: string): RegistryEntry | null {
	return componentRegistry[rel] || null;
}

/**
 * Get the component for a resource based on rel or URL pattern
 *
 * Tries to match in the following order:
 * 1. Direct rel match (from menu navigation state)
 * 2. URL pattern matching (for direct URL access or refresh)
 *
 * @param rel - Navigation `rel` value (from page state when navigating via menu)
 * @param url - Current URL path (for pattern matching fallback)
 * @returns Registry entry with component, or null if no match
 *
 * @example
 * ```typescript
 * // From menu navigation with rel in state
 * const entry = getComponentForResource('sessions', '/users/abc123/sessions/list');
 *
 * // Direct URL access (rel is undefined)
 * const entry = getComponentForResource(undefined, '/users/abc123/sessions/list');
 * ```
 */
export function getComponentForResource(
	rel: string | undefined,
	url: string
): RegistryEntry | null {
	// 1. Try direct rel match first (most reliable)
	if (rel && componentRegistry[rel]) {
		return componentRegistry[rel];
	}

	// 2. Try URL pattern matching (fallback for direct URL access)
	for (const [_key, entry] of Object.entries(componentRegistry)) {
		if (!entry.patterns) continue;

		for (const pattern of entry.patterns) {
			if (typeof pattern === 'string') {
				if (url.includes(pattern) || url === pattern) {
					return entry;
				}
			} else if (pattern instanceof RegExp) {
				if (pattern.test(url)) {
					return entry;
				}
			}
		}
	}

	return null;
}

/**
 * Check if a navigation `rel` has a registered component
 *
 * @param rel - Navigation item `rel` from sitemap
 * @returns True if component is registered
 *
 * @example
 * ```typescript
 * if (hasComponent('sessions')) {
 *   // Dedicated component exists for this resource
 * }
 * ```
 */
export function hasComponent(rel: string): boolean {
	return rel in componentRegistry;
}

/**
 * Check if a URL matches any registered component patterns
 *
 * @param url - URL path to check
 * @returns True if URL matches any registered pattern
 */
export function hasComponentForUrl(url: string): boolean {
	return getComponentForResource(undefined, url) !== null;
}
