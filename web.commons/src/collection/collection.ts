/**
 * Collection Module
 *
 * Main interface for extracting and processing collection data from HAL resources.
 * Combines extraction, inference, and utilities into a simple API.
 */

import type { HalObject } from '@houseofwolves/serverlesslaunchpad.types/hal';
import type { CollectionData, InferenceOptions } from './types';
import { extractEmbeddedItems, getPaginationInfo } from './utils';
import { inferColumns, inferVisibleColumns } from './inference';

/**
 * Extract complete collection data from a HAL resource
 *
 * Automatically extracts items from _embedded, infers column definitions,
 * and extracts pagination info.
 *
 * @param resource - HAL resource containing a collection
 * @param options - Inference and extraction options
 * @returns Complete collection data with items and inferred columns
 *
 * @example
 * ```typescript
 * const response = await apiClient.get('/users/123/sessions');
 * const collection = extractCollection(response);
 *
 * // Use in a table component
 * <Table>
 *   <thead>
 *     <tr>
 *       {collection.columns.map(col => (
 *         <th key={col.key}>{col.label}</th>
 *       ))}
 *     </tr>
 *   </thead>
 *   <tbody>
 *     {collection.items.map(item => (
 *       <tr key={item.id}>
 *         {collection.columns.map(col => (
 *           <td key={col.key}>
 *             <FieldRenderer type={col.type} value={item[col.key]} />
 *           </td>
 *         ))}
 *       </tr>
 *     ))}
 *   </tbody>
 * </Table>
 * ```
 */
export function extractCollection(
    resource: HalObject,
    options: InferenceOptions & {
        /** Optional specific embedded key to extract */
        embeddedKey?: string;
        /** Whether to include hidden columns (default: false) */
        includeHidden?: boolean;
    } = {}
): CollectionData {
    const { embeddedKey, includeHidden = false, ...inferenceOptions } = options;

    // Extract items from _embedded
    const items = extractEmbeddedItems(resource, embeddedKey);

    // Infer column definitions
    const columns = includeHidden
        ? inferColumns(items, inferenceOptions)
        : inferVisibleColumns(items, inferenceOptions);

    // Extract pagination info
    const paginationInfo = getPaginationInfo(resource);

    return {
        items,
        columns,
        total: paginationInfo?.total,
        page: paginationInfo ? {
            number: paginationInfo.page,
            size: paginationInfo.size,
        } : undefined,
    };
}

/**
 * Check if a HAL resource contains a collection
 *
 * @param resource - HAL resource to check
 * @returns True if resource appears to contain a collection
 */
export function isCollection(resource: HalObject | null | undefined): boolean {
    if (!resource) {
        return false;
    }

    // Check if any _embedded property is an array
    if (resource._embedded) {
        for (const value of Object.values(resource._embedded)) {
            if (Array.isArray(value)) {
                return true;
            }
        }
    }

    // Check for pagination indicators
    if (resource.page !== undefined || resource.total !== undefined || resource.size !== undefined) {
        return true;
    }

    return false;
}

/**
 * Get the collection key from a HAL resource
 *
 * Identifies which _embedded property contains the collection.
 *
 * @param resource - HAL resource to inspect
 * @returns The key of the collection property, or undefined if not found
 */
export function getCollectionKey(resource: HalObject): string | undefined {
    if (!resource._embedded) {
        return undefined;
    }

    // Try common keys first
    const commonKeys = ['items', 'results', 'data', 'records'];
    for (const key of commonKeys) {
        if (Array.isArray(resource._embedded[key])) {
            return key;
        }
    }

    // Return first array property
    for (const [key, value] of Object.entries(resource._embedded)) {
        if (Array.isArray(value)) {
            return key;
        }
    }

    return undefined;
}
