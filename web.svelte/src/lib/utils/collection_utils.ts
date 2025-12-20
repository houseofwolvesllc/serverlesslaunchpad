/**
 * Collection Utilities - Svelte Integration
 *
 * Utility functions for working with HAL collections in Svelte.
 * Uses web.commons for collection inference.
 */

import {
    extractEmbeddedItems,
    inferColumns,
    type InferredColumn,
    type HalObject,
} from '@houseofwolves/serverlesslaunchpad.web.commons';

/**
 * Column override type - allows partial override of InferredColumn properties
 */
export type ColumnOverride = Partial<InferredColumn>;

export interface CollectionConfig {
    columnConfig?: Record<string, ColumnOverride>;
    conventions?: Record<string, any>;
    visibleOnly?: boolean;
}

export interface CollectionResult {
    items: any[];
    columns: InferredColumn[];
    allColumns: InferredColumn[];
    keys: string[];
    templates: Record<string, any> | null;
    links: Record<string, any> | null;
    isEmpty: boolean;
    count: number;
}

/**
 * Process a HAL collection resource into a structured result
 */
export function processCollection(
    resource: HalObject | null | undefined,
    config: CollectionConfig = {}
): CollectionResult {
    const { columnConfig = {}, conventions, visibleOnly = true } = config;

    // Extract embedded items
    const items = extractEmbeddedItems(resource || {});

    // Infer columns
    let allColumns: InferredColumn[] = [];
    if (items.length > 0) {
        const inferred = inferColumns(items, { conventions });
        allColumns = inferred.map((col) => {
            const override = columnConfig[col.key];
            if (!override) return col;
            return { ...col, ...override };
        });
    }

    // Filter visible columns
    const columns = visibleOnly ? allColumns.filter((col) => !col.hidden) : allColumns;

    // Extract keys
    const keys = columns.map((col) => col.key);

    // Extract templates and links
    const templates = resource?._templates || null;
    const links = resource?._links || null;

    return {
        items,
        columns,
        allColumns,
        keys,
        templates,
        links,
        isEmpty: items.length === 0,
        count: items.length,
    };
}

/**
 * Selection utilities for managing selected items
 */
export class SelectionManager {
    private selected = new Set<string>();

    constructor(
        private items: any[],
        private primaryKey: string,
        private filterFn?: (item: any) => boolean
    ) {}

    isSelected(id: string): boolean {
        return this.selected.has(id);
    }

    toggleSelection(id: string): void {
        if (this.selected.has(id)) {
            this.selected.delete(id);
        } else {
            this.selected.add(id);
        }
    }

    toggleAll(): void {
        const selectableItems = this.filterFn
            ? this.items.filter(this.filterFn)
            : this.items;

        if (this.allSelected) {
            this.selected.clear();
        } else {
            selectableItems.forEach((item) => {
                const id = item[this.primaryKey];
                if (id) this.selected.add(id);
            });
        }
    }

    clearSelection(): void {
        this.selected.clear();
    }

    get allSelected(): boolean {
        const selectableItems = this.filterFn
            ? this.items.filter(this.filterFn)
            : this.items;

        if (selectableItems.length === 0) return false;
        return selectableItems.every((item) =>
            this.selected.has(item[this.primaryKey])
        );
    }

    get hasSelection(): boolean {
        return this.selected.size > 0;
    }

    get count(): number {
        return this.selected.size;
    }

    get selectedIds(): string[] {
        return Array.from(this.selected);
    }
}
