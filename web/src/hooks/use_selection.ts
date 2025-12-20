import { useState, useCallback, useMemo } from 'react';

/**
 * Custom hook for managing selection state in list views
 *
 * Provides utilities for selecting/deselecting individual items,
 * toggling all items, and querying selection state. Useful for
 * implementing bulk operations with checkboxes.
 *
 * @param items - Array of items that can be selected
 * @param idKey - Key to use for item IDs (default: 'id')
 * @param filterFn - Optional function to filter which items can be selected (e.g., exclude current session)
 * @returns Selection state and management functions
 *
 * @example
 * ```typescript
 * const apiKeys = [
 *   { apiKeyId: '1', label: 'Key 1' },
 *   { apiKeyId: '2', label: 'Key 2' }
 * ];
 *
 * const {
 *   selected,
 *   toggleSelection,
 *   toggleAll,
 *   clearSelection,
 *   isSelected,
 *   hasSelection
 * } = useSelection(apiKeys, 'apiKeyId');
 *
 * // Render checkboxes
 * {apiKeys.map(key => (
 *   <Checkbox
 *     key={key.apiKeyId}
 *     checked={isSelected(key.apiKeyId)}
 *     onChange={() => toggleSelection(key.apiKeyId)}
 *   />
 * ))}
 *
 * // Bulk action button
 * {hasSelection && (
 *   <Button onClick={() => bulkDelete(selected)}>
 *     Delete Selected ({selected.length})
 *   </Button>
 * )}
 *
 * // Example with filter (exclude current session)
 * const sessions = [
 *   { sessionId: '1', isCurrent: true },
 *   { sessionId: '2', isCurrent: false }
 * ];
 * const { selected } = useSelection(
 *   sessions,
 *   'sessionId',
 *   (session) => !session.isCurrent
 * );
 * ```
 */
export function useSelection<T extends Record<string, any>>(
    items: T[],
    idKey: string = 'id',
    filterFn?: (item: T) => boolean
) {
    const [selectedSet, setSelectedSet] = useState<Set<string>>(new Set());

    /**
     * Toggle selection for a single item
     */
    const toggleSelection = useCallback((id: string) => {
        setSelectedSet(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    /**
     * Get selectable items (items that pass the filter function)
     */
    const selectableItems = useMemo(() => {
        return filterFn ? items.filter(filterFn) : items;
    }, [items, filterFn]);

    /**
     * Toggle all items (select all if not all selected, deselect all otherwise)
     * Only selects items that pass the filter function (if provided)
     */
    const toggleAll = useCallback(() => {
        if (selectedSet.size === selectableItems.length && selectableItems.length > 0) {
            // All selected -> deselect all
            setSelectedSet(new Set());
        } else {
            // Not all selected -> select all selectable items only
            setSelectedSet(new Set(selectableItems.map(item => item[idKey])));
        }
    }, [selectableItems, selectedSet.size, idKey]);

    /**
     * Clear all selections
     */
    const clearSelection = useCallback(() => {
        setSelectedSet(new Set());
    }, []);

    /**
     * Check if an item is selected
     */
    const isSelected = useCallback((id: string) => {
        return selectedSet.has(id);
    }, [selectedSet]);

    /**
     * Computed selection state flags
     * Uses selectableItems to properly handle filtered items (e.g., disabled items)
     */
    const selectionState = useMemo(() => {
        const allSelected = selectableItems.length > 0 && selectedSet.size === selectableItems.length;
        const someSelected = selectedSet.size > 0 && selectedSet.size < selectableItems.length;
        const hasSelection = selectedSet.size > 0;

        return {
            allSelected,
            someSelected,
            hasSelection
        };
    }, [selectableItems.length, selectedSet.size]);

    /**
     * Array of selected IDs
     */
    const selected = useMemo(() => {
        return Array.from(selectedSet);
    }, [selectedSet]);

    return {
        /** Array of selected IDs */
        selected,
        /** Set of selected IDs (for faster lookups) */
        selectedSet,
        /** Toggle selection for a single item */
        toggleSelection,
        /** Toggle all items (select/deselect all) */
        toggleAll,
        /** Clear all selections */
        clearSelection,
        /** Check if an item is selected */
        isSelected,
        /** true if all items are selected */
        allSelected: selectionState.allSelected,
        /** true if some (but not all) items are selected */
        someSelected: selectionState.someSelected,
        /** true if at least one item is selected */
        hasSelection: selectionState.hasSelection,
        /** Number of selected items */
        count: selectedSet.size
    };
}
