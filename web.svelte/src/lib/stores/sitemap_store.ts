/**
 * Sitemap Store
 *
 * Manages sitemap data with caching, retry logic, and automatic refresh
 * on authentication state changes.
 */

import { writable, get } from 'svelte/store';
import type { HalLink, HalTemplate } from '@houseofwolves/serverlesslaunchpad.types/hal';
import type { NavItem, NavGroup, LinksGroupProps } from '$lib/types/navigation';
import { apiClient } from '$lib/services/api_client';
import { getEntryPoint } from '$lib/services/entry_point_provider';
import { authStore } from './auth_store';
import {
	transformNavStructure,
	createFallbackNavigation,
	resolveNavItem
} from '$lib/utils/navigation_helpers';
import { logger } from '$lib/logging';

/**
 * Cache TTL in milliseconds (5 minutes)
 */
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Max retry attempts for failed requests
 */
const MAX_RETRIES = 3;

/**
 * Initial delay between retries in milliseconds
 */
const RETRY_DELAY = 1000;

/**
 * Sitemap state
 */
export interface SitemapState {
	/** Hierarchical navigation structure from API */
	navStructure: (NavItem | NavGroup)[] | null;
	/** HAL links from sitemap (for resolving nav items) */
	links: Record<string, HalLink> | null;
	/** HAL templates from sitemap (for resolving nav items) */
	templates: Record<string, HalTemplate> | null;
	/** Transformed navigation for sidebar rendering */
	navigation: LinksGroupProps[];
	/** Loading state */
	isLoading: boolean;
	/** Error state */
	error: Error | null;
	/** Timestamp of last successful fetch */
	lastFetched: number | null;
}

/**
 * Sitemap API response structure
 */
interface SitemapResponse {
	_nav: (NavItem | NavGroup)[];
	_links?: Record<string, HalLink>;
	_templates?: Record<string, HalTemplate>;
}

/**
 * Fetch sitemap with retry logic
 *
 * @param retryCount - Current retry attempt
 * @returns Sitemap response
 */
async function fetchWithRetry(retryCount = 0): Promise<SitemapResponse> {
	try {
		const entryPoint = getEntryPoint();

		// Discover sitemap endpoint
		const sitemapHref = await entryPoint.getLinkHref('sitemap');
		if (!sitemapHref) {
			throw new Error('Sitemap capability not available from API');
		}

		logger.debug('[Sitemap] Fetching sitemap', { href: sitemapHref, retryCount });

		const response = await apiClient.get(sitemapHref);

		// Validate response structure
		if (!(response as any)._nav) {
			throw new Error('Invalid sitemap response structure: missing _nav');
		}

		return response as SitemapResponse;
	} catch (error) {
		// Retry logic
		if (retryCount < MAX_RETRIES) {
			const delay = RETRY_DELAY * (retryCount + 1); // Exponential backoff
			logger.warn('[Sitemap] Fetch failed, retrying', {
				attempt: retryCount + 1,
				maxRetries: MAX_RETRIES,
				delay,
				error
			});

			await new Promise((resolve) => setTimeout(resolve, delay));
			return fetchWithRetry(retryCount + 1);
		}

		logger.error('[Sitemap] Fetch failed after max retries', { error });
		throw error;
	}
}

/**
 * Create sitemap store
 */
function createSitemapStore() {
	const initialState: SitemapState = {
		navStructure: null,
		links: null,
		templates: null,
		navigation: [],
		isLoading: false,
		error: null,
		lastFetched: null
	};

	const { subscribe, update } = writable<SitemapState>(initialState);

	let abortController: AbortController | null = null;

	/**
	 * Fetch sitemap from API
	 *
	 * @param forceRefresh - Force refresh even if cache is valid
	 */
	async function fetchSitemap(forceRefresh = false) {
		const currentState = get(sitemapStore);

		// Check cache validity
		if (!forceRefresh && currentState.lastFetched) {
			const age = Date.now() - currentState.lastFetched;
			if (age < CACHE_TTL) {
				logger.debug('[Sitemap] Using cached data', {
					age,
					ttl: CACHE_TTL,
					remainingTTL: CACHE_TTL - age
				});
				return;
			} else {
				logger.debug('[Sitemap] Cache expired', { age, ttl: CACHE_TTL });
			}
		}

		// Cancel any pending request
		if (abortController) {
			abortController.abort();
		}
		abortController = new AbortController();

		update((s) => ({ ...s, isLoading: true, error: null }));

		try {
			const response = await fetchWithRetry();

			// Create resolver function
			const resolver = (item: NavItem) =>
				resolveNavItem(item, response._links || {}, response._templates || {});

			// Transform navigation structure
			const transformed = transformNavStructure(response._nav, resolver);

			// Debug log the raw navigation structure
			logger.info('[Sitemap] Raw navigation structure', {
				navGroups: response._nav.length,
				nav: response._nav,
				linkCount: Object.keys(response._links || {}).length,
				links: Object.entries(response._links || {}).map(([key, link]) => ({
					key,
					href: link.href,
					title: link.title
				})),
				templateCount: Object.keys(response._templates || {}).length,
				templates: Object.entries(response._templates || {}).map(([key, tmpl]) => ({
					key,
					target: tmpl.target,
					method: tmpl.method,
					title: tmpl.title
				}))
			});

			logger.info('[Sitemap] Transformed navigation', {
				groupCount: transformed.length,
				groups: transformed.map(g => ({ label: g.label, linkCount: g.links?.length || 0 }))
			});

			update((s) => ({
				...s,
				navStructure: response._nav,
				links: response._links || null,
				templates: response._templates || null,
				navigation: transformed,
				isLoading: false,
				error: null,
				lastFetched: Date.now()
			}));

			logger.info('[Sitemap] Loaded successfully', {
				groupCount: transformed.length,
				hasLinks: !!response._links,
				hasTemplates: !!response._templates
			});
		} catch (error) {
			const err = error instanceof Error ? error : new Error('Failed to load sitemap');

			logger.error('[Sitemap] Load failed', { error: err });

			update((s) => ({
				...s,
				error: err,
				isLoading: false,
				navigation: createFallbackNavigation()
			}));
		}
	}

	return {
		subscribe,

		/**
		 * Fetch sitemap (uses cache if valid)
		 */
		fetch: () => fetchSitemap(false),

		/**
		 * Refresh sitemap (bypasses cache)
		 */
		refresh: () => fetchSitemap(true)
	};
}

export const sitemapStore = createSitemapStore();

/**
 * Auto-fetch sitemap when auth state changes
 *
 * This ensures the sitemap is refreshed when:
 * - User signs in
 * - User signs out
 * - Session is restored on page load
 */
authStore.subscribe(($auth) => {
	if ($auth.initialized) {
		logger.debug('[Sitemap] Auth initialized, fetching sitemap', {
			hasUser: !!$auth.user
		});
		sitemapStore.fetch();
	}
});
