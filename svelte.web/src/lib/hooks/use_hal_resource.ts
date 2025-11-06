import { writable } from 'svelte/store';
import type { HalObject } from '@houseofwolves/serverlesslaunchpad.types/hal';
import { halClient } from '$lib/hal_forms_client';
import { logger } from '$lib/logging';

export interface HalResourceState<T extends HalObject = HalObject> {
	data: T | null;
	loading: boolean;
	error: Error | null;
}

/**
 * Hook for fetching and managing HAL resources
 *
 * @param url - The URL to fetch the HAL resource from
 * @returns Writable store with resource state and refresh function
 */
export function createHalResource<T extends HalObject = HalObject>(url: string) {
	const initialState: HalResourceState<T> = {
		data: null,
		loading: false,
		error: null,
	};

	const { subscribe, set, update } = writable<HalResourceState<T>>(initialState);

	async function fetch() {
		update(state => ({ ...state, loading: true, error: null }));

		try {
			logger.info('Fetching HAL resource', { url });
			const data = await halClient.fetch(url);

			update(state => ({
				...state,
				data: data as T,
				loading: false,
				error: null,
			}));

			logger.info('HAL resource fetched successfully', { url });
		} catch (error: any) {
			logger.error('Failed to fetch HAL resource', { url, error: error.message });

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
