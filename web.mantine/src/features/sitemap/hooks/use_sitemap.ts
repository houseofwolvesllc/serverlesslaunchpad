/**
 * useSitemap Hook
 *
 * Custom React hook for fetching and managing API sitemap data.
 *
 * Features:
 * - Fetches navigation structure from /sitemap endpoint
 * - Caches data for 5 minutes to reduce API calls
 * - Invalidates cache on authentication state changes
 * - Provides loading and error states
 * - Transforms API navigation items to UI-ready format
 */

import { useState, useEffect, useCallback, useRef, useContext } from 'react';
import { halClient } from '../../../lib/hal_forms_client';
import { type ApiResponse } from '../../../services/api.client';
import { getEntryPoint } from '../../../services/entry_point_provider';
import {
    transformNavStructure,
    createFallbackNavigation,
    type NavigationItem,
    type LinksGroupProps,
    type UserContext,
} from '../utils/transform_navigation';
import { AuthenticationContext } from '../../authentication';
import { logger } from '../../../logging/logger';
import type { NavGroup, NavItem, ResolvedNavItem } from '../../../hooks/use_navigation';
import type { HalLink, HalTemplate } from '@houseofwolves/serverlesslaunchpad.types/hal';

/**
 * Sitemap API response structure (HAL format with _nav)
 */
interface SitemapResponse extends ApiResponse {
    title: string;
    _nav?: NavGroup[];
    _links?: Record<string, HalLink>;
    _templates?: Record<string, HalTemplate>;
    // Backward compatibility: old navigation structure
    navigation?: {
        items: NavigationItem[];
    };
}

/**
 * Cached sitemap data
 */
interface CachedSitemap {
    timestamp: number;
    _nav: NavGroup[];
    _links?: Record<string, HalLink>;
    _templates?: Record<string, HalTemplate>;
}

/**
 * Hook return value
 */
export interface UseSitemapResult {
    /** Transformed navigation items ready for rendering */
    navigation: LinksGroupProps[];
    /** Hierarchical navigation structure from API (for breadcrumbs and route generation) */
    navStructure?: (NavItem | NavGroup)[];
    /** HAL links from sitemap (for resolving nav items) */
    links?: Record<string, HalLink>;
    /** HAL templates from sitemap (for resolving nav items) */
    templates?: Record<string, HalTemplate>;
    /** Loading state */
    isLoading: boolean;
    /** Error state (undefined if no error) */
    error: Error | undefined;
    /** Function to manually refetch the sitemap */
    refetch: () => Promise<void>;
}

/**
 * Cache TTL in milliseconds (5 minutes)
 */
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Max retry attempts for failed requests
 */
const MAX_RETRIES = 3;

/**
 * Delay between retries in milliseconds
 */
const RETRY_DELAY = 1000;

/**
 * Resolve a navigation item to its actual link or template
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
            type: 'link'
        };
    } else {
        const template = templates[item.rel];
        if (!template) return null;

        return {
            href: template.target,
            title: item.title || template.title || item.rel,
            type: 'template',
            method: template.method,
            template
        };
    }
}

/**
 * Custom hook to fetch and manage sitemap data
 *
 * @returns Object containing navigation, loading state, error state, and refetch function
 *
 * @example
 * ```typescript
 * function Dashboard() {
 *   const { navigation, isLoading, error, refetch } = useSitemap();
 *
 *   if (isLoading) return <LoadingSkeleton />;
 *   if (error) return <ErrorState onRetry={refetch} />;
 *
 *   return navigation.map(item => <LinksGroup {...item} />);
 * }
 * ```
 */
export function useSitemap(): UseSitemapResult {
    const [navigation, setNavigation] = useState<LinksGroupProps[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | undefined>(undefined);

    const cacheRef = useRef<CachedSitemap | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Get authentication context for user info and auth state tracking
    const { signedInUser } = useContext(AuthenticationContext);

    // Create user context for template expansion and role filtering
    // Note: Role filtering is done server-side in the sitemap endpoint
    // The API returns only navigation items the user is authorized to see
    const userContext: UserContext = {
        userId: signedInUser?.username,
        // Role is not currently available in the User interface
        // The sitemap API handles role-based filtering server-side
        role: undefined,
    };

    /**
     * Check if cached data is still valid
     */
    const isCacheValid = useCallback((): boolean => {
        if (!cacheRef.current) {
            return false;
        }

        const now = Date.now();
        const age = now - cacheRef.current.timestamp;

        return age < CACHE_TTL;
    }, []);

    /**
     * Fetch sitemap from API with retry logic
     */
    const fetchSitemap = useCallback(
        async (retryCount = 0): Promise<void> => {
            try {
                const entryPoint = getEntryPoint();

                // Discover sitemap endpoint
                const sitemapHref = await entryPoint.getLinkHref('sitemap');
                if (!sitemapHref) {
                    throw new Error('Sitemap capability not available from API');
                }

                // Cancel any pending request
                if (abortControllerRef.current) {
                    abortControllerRef.current.abort();
                }

                // Create new abort controller
                abortControllerRef.current = new AbortController();

                const response = await halClient.get<SitemapResponse>(sitemapHref);

                // Validate response structure
                if (!response._nav) {
                    throw new Error('Invalid sitemap response structure: missing _nav');
                }

                // Update cache with the hierarchical structure
                cacheRef.current = {
                    timestamp: Date.now(),
                    _nav: response._nav,
                    _links: response._links,
                    _templates: response._templates,
                };
            } catch (err) {
                // Don't retry if request was aborted
                if (err instanceof Error && err.name === 'AbortError') {
                    throw err;
                }

                // Retry logic
                if (retryCount < MAX_RETRIES) {
                    logger.warn('Sitemap fetch failed, retrying', {
                        attempt: retryCount + 1,
                        maxRetries: MAX_RETRIES,
                        error: err,
                    });

                    // Wait before retrying
                    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));

                    return fetchSitemap(retryCount + 1);
                }

                throw err;
            }
        },
        []
    );

    /**
     * Load sitemap data (from cache or API)
     */
    const loadSitemap = useCallback(
        async (forceRefresh = false) => {
            try {
                setIsLoading(true);
                setError(undefined);

                // Fetch sitemap if needed
                if (forceRefresh || !isCacheValid()) {
                    await fetchSitemap();
                }

                // Transform navigation items
                let transformed: LinksGroupProps[];

                // Use new _nav structure if available, otherwise fall back to old structure
                if (cacheRef.current?._nav && cacheRef.current?._links) {
                    const navGroups = cacheRef.current._nav;
                    const links = cacheRef.current._links;
                    const templates = cacheRef.current._templates || {};

                    // Create resolver function
                    const resolver = (item: NavItem) => resolveNavItem(item, links, templates);

                    // Transform new structure
                    transformed = transformNavStructure(navGroups, resolver);
                } else {
                    // Fallback: old transformation (should not happen with updated API)
                    transformed = createFallbackNavigation(userContext);
                }

                setNavigation(transformed);
            } catch (err) {
                logger.error('Failed to load sitemap', { error: err });

                const error = err instanceof Error ? err : new Error('Failed to load sitemap');
                setError(error);

                // Use fallback navigation on error
                const fallback = createFallbackNavigation(userContext);
                setNavigation(fallback);
            } finally {
                setIsLoading(false);
            }
        },
        [fetchSitemap, isCacheValid, userContext]
    );

    /**
     * Manual refetch function
     */
    const refetch = useCallback(async () => {
        await loadSitemap(true);
    }, [loadSitemap]);

    /**
     * Initial load and auth state change handler
     */
    useEffect(() => {
        // Load sitemap on mount and when auth state changes
        loadSitemap();

        // Cleanup: abort pending requests
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [signedInUser?.username]); // Re-fetch when user changes (login/logout)

    return {
        navigation,
        navStructure: cacheRef.current?._nav,
        links: cacheRef.current?._links,
        templates: cacheRef.current?._templates,
        isLoading,
        error,
        refetch,
    };
}
