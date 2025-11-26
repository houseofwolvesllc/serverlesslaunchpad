import { writable } from 'svelte/store';
import type { HalObject } from '@houseofwolves/serverlesslaunchpad.types/hal';
import { halClient } from '$lib/hal_forms_client';
import { apiClient } from '$lib/services/api_client';
import { entryPoint } from '$lib/services/entry_point';
import { trackHalResource } from '$lib/utils/hal_resource_tracking';
import { logger } from '$lib/logging';

export interface HalResourceState<T extends HalObject = HalObject> {
	data: T | null;
	loading: boolean;
	error: Error | null;
}

/**
 * Hook for fetching and managing HAL resources
 *
 * Uses URL convention to determine GET vs POST (NOT sitemap matching):
 * 1. URLs ending in `/list` → POST (collection list endpoints)
 * 2. User-specific paths `/users/{id}/{template}` → discover template from user resource, then POST
 * 3. Template names (no leading '/') → discover endpoint via entry point, then POST
 * 4. All other URLs → GET
 *
 * This ensures HATEOAS works correctly for ANY user's resources,
 * not just the current user. The sitemap is only for navigation menu.
 *
 * @param urlOrTemplate - Either a URL path (e.g., '/users/me/api-keys/list') or template name (e.g., 'api-keys')
 * @returns Writable store with resource state and refresh function
 *
 * @example
 * // Collection list (POST - ends with /list)
 * const resource = createHalResource('/users/123/api-keys/list');
 *
 * // Direct URL (GET)
 * const resource = createHalResource('/users/me');
 *
 * // Template discovery (POST)
 * const resource = createHalResource('api-keys');
 */
export function createHalResource<T extends HalObject = HalObject>(urlOrTemplate: string) {
	const initialState: HalResourceState<T> = {
		data: null,
		loading: false,
		error: null,
	};

	const { subscribe, set, update } = writable<HalResourceState<T>>(initialState);

	/**
	 * Parse user-specific path and extract userId and template name
	 * Handles both simple paths and /list suffix paths:
	 * - '/users/123/api-keys' -> { userId: '123', templateName: 'api-keys' }
	 * - '/users/123/api-keys/list' -> { userId: '123', templateName: 'api-keys' }
	 * - '/users/123/sessions/list' -> { userId: '123', templateName: 'sessions' }
	 */
	function parseUserSpecificPath(path: string): { userId: string; templateName: string } | null {
		// Match /users/{userId}/{templateName} with optional /list suffix
		const match = path.match(/^\/users\/([^\/]+)\/([\w-]+)(\/list)?$/);
		if (match) {
			return {
				userId: match[1],
				templateName: match[2]
			};
		}
		return null;
	}

	/**
	 * Check if URL is a collection list endpoint (ends with /list)
	 * These are POST endpoints that return collections with search/filter support
	 */
	function isListEndpoint(url: string): boolean {
		return url.endsWith('/list');
	}

	async function fetch() {
		update(state => ({ ...state, loading: true, error: null }));

		try {
			let data: HalObject;

			// URL-based routing (starts with '/')
			if (urlOrTemplate.startsWith('/')) {
				const userPath = parseUserSpecificPath(urlOrTemplate);

				if (userPath) {
					// User-specific path detected (e.g., /users/123/api-keys or /users/123/api-keys/list)
					// Discover template from user resource, then POST to template target
					logger.info('Detected user-specific path', {
						path: urlOrTemplate,
						userId: userPath.userId,
						templateName: userPath.templateName
					});

					// Fetch the user resource to discover the template
					const userResource = await apiClient.get(`/users/${userPath.userId}`);

					// Find the template in the user resource
					const resourceTemplate = userResource?._templates?.[userPath.templateName];

					if (!resourceTemplate?.target) {
						throw new Error(`Template '${userPath.templateName}' not available for user ${userPath.userId}`);
					}

					logger.info('User-specific template discovered', {
						userId: userPath.userId,
						templateName: userPath.templateName,
						target: resourceTemplate.target
					});

					// POST to the template target
					data = await apiClient.post(resourceTemplate.target, {});
				} else if (isListEndpoint(urlOrTemplate)) {
					// URL ends with /list - this is a collection POST endpoint
					// POST directly to the URL (no discovery needed)
					logger.info('Fetching collection via POST (list endpoint)', { url: urlOrTemplate });
					data = await apiClient.post(urlOrTemplate, {});
				} else {
					// Regular URL path - direct fetch via GET
					logger.info('Fetching HAL resource via GET', { url: urlOrTemplate });
					data = await halClient.fetch(urlOrTemplate);
				}
			}
			// Template name (no '/') - discover and execute
			else {
				logger.info('Discovering endpoint for template', { template: urlOrTemplate });
				const templateTarget = await entryPoint.getTemplateTarget(urlOrTemplate);

				if (!templateTarget) {
					throw new Error(`Template '${urlOrTemplate}' not found in entry point`);
				}

				logger.info('Template target discovered', { template: urlOrTemplate, target: templateTarget });

				// POST to template target to get the resource
				data = await apiClient.post(templateTarget, {});
			}

			update(state => ({
				...state,
				data: data as T,
				loading: false,
				error: null,
			}));

			// Track resource in navigation history
			trackHalResource(data as T);

			logger.info('HAL resource fetched successfully', { urlOrTemplate });
		} catch (error: any) {
			logger.error('Failed to fetch HAL resource', { urlOrTemplate, error: error.message });

			update(state => ({
				...state,
				loading: false,
				error,
			}));
		}
	}

	async function refresh() {
		await fetch();
	}

	// Initial fetch
	fetch();

	return {
		subscribe,
		refresh,
	};
}

/**
 * Follow a HAL link relation
 *
 * @param resource - The HAL resource containing links
 * @param rel - The link relation to follow
 * @returns Promise with the linked resource or null if link not found
 */
export async function followLink<T extends HalObject = HalObject>(
	resource: HalObject,
	rel: string
): Promise<T | null> {
	const link = resource._links?.[rel];

	if (!link) {
		logger.warn('Link relation not found', { rel });
		return null;
	}

	const href = Array.isArray(link) ? link[0].href : link.href;

	try {
		logger.info('Following link', { rel, href });
		const data = await halClient.fetch(href);
		return data as T;
	} catch (error: any) {
		logger.error('Failed to follow link', { rel, href, error: error.message });
		throw error;
	}
}
