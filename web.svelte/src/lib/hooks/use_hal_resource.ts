import { writable } from 'svelte/store';
import type { HalObject } from '@houseofwolves/serverlesslaunchpad.types/hal';
import { halClient } from '$lib/hal_forms_client';
import { apiClient } from '$lib/services/api_client';
import { entryPoint } from '$lib/services/entry_point';
import { logger } from '$lib/logging';

export interface HalResourceState<T extends HalObject = HalObject> {
	data: T | null;
	loading: boolean;
	error: Error | null;
}

/**
 * Hook for fetching and managing HAL resources
 *
 * Supports two modes:
 * 1. URL mode: Pass a full URL path (starts with '/') to fetch directly
 * 2. Template mode: Pass a template name (no leading '/') to discover endpoint via entry point
 *
 * @param urlOrTemplate - Either a URL path (e.g., '/users/me/api-keys') or template name (e.g., 'api-keys')
 * @returns Writable store with resource state and refresh function
 *
 * @example
 * // Direct URL
 * const resource = createHalResource('/users/me/api-keys');
 *
 * // Template discovery
 * const resource = createHalResource('api-keys');
 */
export function createHalResource<T extends HalObject = HalObject>(urlOrTemplate: string) {
	const initialState: HalResourceState<T> = {
		data: null,
		loading: false,
		error: null,
	};

	const { subscribe, set, update } = writable<HalResourceState<T>>(initialState);

	async function fetch() {
		update(state => ({ ...state, loading: true, error: null }));

		try {
			let data: HalObject;

			// Check if this is a URL (starts with '/') or a template name
			if (urlOrTemplate.startsWith('/')) {
				// Direct URL fetch
				logger.info('Fetching HAL resource', { url: urlOrTemplate });
				data = await halClient.fetch(urlOrTemplate);
			} else {
				// Template-based discovery
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
