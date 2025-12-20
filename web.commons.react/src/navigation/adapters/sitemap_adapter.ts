import type { HalLink, HalTemplate } from '@houseofwolves/serverlesslaunchpad.types/hal';
import type { NavItem, NavGroup } from '../types';

/**
 * Adapter interface for sitemap data providers
 *
 * Each React project should implement this interface to provide sitemap data
 * to the shared navigation hooks. This allows the shared hooks to remain
 * framework-agnostic while each project handles its own data fetching.
 *
 * @example
 * ```typescript
 * // In a React project:
 * function useSitemapAdapter(): SitemapAdapter {
 *   const { data, loading, error, refetch } = useHalResource('/sitemap');
 *
 *   return {
 *     navStructure: data?._nav,
 *     links: data?._links as Record<string, HalLink>,
 *     templates: data?._templates as Record<string, HalTemplate>,
 *     isLoading: loading,
 *     error: error || undefined,
 *     refetch
 *   };
 * }
 * ```
 */
export interface SitemapAdapter {
  /** Hierarchical navigation structure from API (for breadcrumbs and route generation) */
  navStructure?: (NavItem | NavGroup)[];
  /** HAL links from sitemap (for resolving nav items) */
  links?: Record<string, HalLink>;
  /** HAL templates from sitemap (for resolving nav items) */
  templates?: Record<string, HalTemplate>;
  /** Loading state */
  isLoading: boolean;
  /** Error state (undefined if no error) */
  error?: Error;
  /** Function to manually refetch the sitemap */
  refetch: () => Promise<void>;
}
