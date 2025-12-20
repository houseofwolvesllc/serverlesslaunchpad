/**
 * HAL collection types
 * Used for paginated collections of resources
 */

import { HalObject } from './hal.js';

/**
 * HAL collection type
 * Represents a collection of resources with pagination
 */
export interface HalCollection<T = any> extends HalObject {
    /** Embedded items in the collection */
    _embedded?: {
        [rel: string]: Array<T & HalObject>;
    };

    /** Total count of items in the collection */
    count?: number;

    /** Pagination metadata */
    paging?: {
        /** Token/cursor for next page */
        next?: string;

        /** Token/cursor for previous page */
        previous?: string;

        /** Token/cursor for current page */
        current?: string;

        /** Total number of items across all pages */
        total?: number;

        /** Current page number (if using offset pagination) */
        page?: number;

        /** Total number of pages (if using offset pagination) */
        pages?: number;

        /** Items per page */
        limit?: number;

        /** Current offset (if using offset pagination) */
        offset?: number;
    };
}
