/**
 * Client-side pagination state for cursor-based pagination
 * Used by web application hooks to track pagination UI state
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

/**
 * Pagination state for cursor-based pagination
 * Tracks client-side pagination UI state
 */
export interface PaginationState {
    /** Whether there is a next page available */
    hasNext: boolean;

    /** Whether there is a previous page available */
    hasPrevious: boolean;

    /** Number of items per page */
    pageSize: number;
}
