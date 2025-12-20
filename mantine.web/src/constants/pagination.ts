/**
 * Shared pagination constants for all list views
 */

/**
 * Available page size options for paginated lists
 * Update this array to change options across all features
 */
export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

/**
 * Page size type derived from available options
 */
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

/**
 * Default page size when none is specified
 */
export const DEFAULT_PAGE_SIZE: PageSize = 25;
