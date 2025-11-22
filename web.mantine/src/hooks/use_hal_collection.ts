/**
 * useHalCollection - React Hook for HAL Collection Inference
 *
 * This hook wraps the pure TypeScript collection inference logic from web.commons
 * and provides a reactive interface for React components.
 */

import { useMemo } from 'react';
import {
    inferColumns,
    extractEmbeddedItems,
    getUniqueKeys,
    type InferredColumn,
    type FieldConventions,
    type HalObject,
} from '@houseofwolves/serverlesslaunchpad.web.commons';

export interface ColumnOverride {
    label?: string;
    hidden?: boolean;
    sortable?: boolean;
    priority?: number;
    width?: string;
    nullText?: string;
}

export interface ColumnConfig {
    [key: string]: ColumnOverride;
}

export interface UseHalCollectionOptions {
    columnConfig?: ColumnConfig;
    conventions?: Partial<FieldConventions>;
    visibleOnly?: boolean;
}

export interface UseHalCollectionResult {
    items: HalObject[];
    columns: InferredColumn[];
    allColumns: InferredColumn[];
    keys: string[];
    templates: Record<string, any> | undefined;
    links: Record<string, any> | undefined;
    isEmpty: boolean;
    count: number;
}

/**
 * React hook for HAL collection inference
 *
 * @param resource - HAL resource object with _embedded items
 * @param options - Configuration options
 * @returns Collection data with inferred columns
 *
 * @example
 * ```tsx
 * const { items, columns, templates } = useHalCollection(resource, {
 *   columnConfig: {
 *     dateLastUsed: { nullText: "Never" }
 *   }
 * });
 * ```
 */
export function useHalCollection(
    resource: HalObject | null | undefined,
    options: UseHalCollectionOptions = {}
): UseHalCollectionResult {
    const { columnConfig = {}, conventions, visibleOnly = true } = options;

    // Extract embedded items
    const items = useMemo(
        () => extractEmbeddedItems(resource || {}),
        [resource]
    );

    // Get all unique keys
    const keys = useMemo(
        () => getUniqueKeys(items),
        [items]
    );

    // Infer all columns
    const allColumns = useMemo(() => {
        if (items.length === 0) return [];

        const inferred = inferColumns(items, { conventions });

        // Apply column config overrides
        return inferred.map(col => {
            const override = columnConfig[col.key];
            if (!override) return col;

            return {
                ...col,
                ...override,
            };
        });
    }, [items, columnConfig, conventions]);

    // Get visible columns only
    const columns = useMemo(() => {
        if (!visibleOnly) return allColumns;
        return allColumns.filter(col => !col.hidden);
    }, [allColumns, visibleOnly]);

    return {
        items,
        columns,
        allColumns,
        keys,
        templates: resource?._templates,
        links: resource?._links,
        isEmpty: items.length === 0,
        count: items.length,
    };
}
