/**
 * HalCollectionList - Generic collection component for HAL resources
 *
 * This component automatically renders a table with:
 * - Inferred columns from embedded items
 * - Selection and bulk operations
 * - Action toolbar with create/refresh/delete
 * - Field renderers based on data type
 * - Empty and loading states
 *
 * This is the main component that drastically reduces feature code.
 */

import { Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useHalCollection, type ColumnConfig } from '../../hooks/use_hal_collection';
import { useSelection } from '../../hooks/use_selection';
import { HalResourceRow } from './hal_resource_row';
import { type FieldRenderer } from './field_renderers';
import { type HalObject } from '@houseofwolves/serverlesslaunchpad.web.commons';

export interface HalCollectionListProps {
    resource: HalObject | null | undefined;
    onRefresh?: () => void;
    onCreate?: () => void;
    onBulkDelete?: (selectedIds: string[]) => void;
    onRowClick?: (item: HalObject) => void;
    columnConfig?: ColumnConfig;
    customRenderers?: Record<string, FieldRenderer>;
    primaryKey?: string;
    emptyMessage?: string;
    emptyIcon?: React.ReactNode;
    showCreateButton?: boolean;
    showRefreshButton?: boolean;
    showBulkDelete?: boolean;
    selectableFilter?: (item: HalObject) => boolean;
    /** Page title to display in the header row */
    title?: string;
}

/**
 * Generic HAL collection list component
 *
 * @example
 * ```tsx
 * // Minimal usage - everything automatic
 * <HalCollectionList
 *   resource={data}
 *   onRefresh={refresh}
 * />
 *
 * // With customization
 * <HalCollectionList
 *   resource={data}
 *   onRefresh={refresh}
 *   onCreate={() => setCreateModalOpen(true)}
 *   onBulkDelete={handleBulkDelete}
 *   columnConfig={{
 *     dateLastUsed: { nullText: "Never" }
 *   }}
 *   customRenderers={{
 *     status: (value, col, item) => <CustomStatusBadge item={item} />
 *   }}
 * />
 * ```
 */
export function HalCollectionList({
    resource,
    onRefresh,
    onCreate,
    onBulkDelete,
    onRowClick,
    columnConfig = {},
    customRenderers,
    primaryKey = 'id',
    emptyMessage = 'No items found',
    emptyIcon,
    showCreateButton = true,
    showRefreshButton = true,
    showBulkDelete = true,
    selectableFilter,
    title,
}: HalCollectionListProps) {
    const { items, columns, templates, isEmpty } = useHalCollection(resource, { columnConfig });

    // Detect primary key from first item if not provided
    const detectedPrimaryKey =
        items.length > 0
            ? Object.keys(items[0]).find((key) => key.toLowerCase().endsWith('id')) || primaryKey
            : primaryKey;

    const {
        selected,
        toggleSelection,
        toggleAll,
        clearSelection,
        isSelected,
        allSelected,
        hasSelection,
        count: selectedCount,
    } = useSelection(items, detectedPrimaryKey);

    // Get templates from resource
    const createTemplate = templates?.default || templates?.create;
    const bulkDeleteTemplate = templates?.bulkDelete || templates?.['bulk-delete'];

    // Determine if bulk delete is available
    const canBulkDelete = showBulkDelete && (!!bulkDeleteTemplate || !!onBulkDelete);

    // Handle create action
    const handleCreate = () => {
        if (onCreate) {
            onCreate();
        }
    };

    // Handle bulk delete action
    const handleBulkDelete = () => {
        if (onBulkDelete) {
            const selectedIds = Array.from(selected);
            onBulkDelete(selectedIds);
        }
    };

    // Handle refresh action
    const handleRefresh = () => {
        if (onRefresh) {
            onRefresh();
        }
    };

    // Handle select all checkbox - only select selectable items
    const handleSelectAll = () => {
        if (selectableFilter) {
            // Filter items to only include selectable ones
            const selectableItems = items.filter(selectableFilter);
            const selectableIds = selectableItems.map(item => item[detectedPrimaryKey]);

            // Check if all selectable items are selected
            const allSelectableSelected = selectableIds.every(id => isSelected(id));

            if (allSelectableSelected) {
                // Deselect all
                clearSelection();
            } else {
                // Select all selectable items
                selectableIds.forEach(id => {
                    if (!isSelected(id)) {
                        toggleSelection(id);
                    }
                });
            }
        } else {
            toggleAll();
        }
    };

    // Empty state
    if (isEmpty) {
        return (
            <div className="space-y-4">
                {/* Page title */}
                {title && (
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
                    </div>
                )}

                {/* Action toolbar */}
                <div className="flex items-center justify-end gap-2">
                    {showCreateButton && createTemplate && (
                        <button className="btn btn-sm border border-base-300 bg-base-100 hover:bg-base-200" onClick={handleCreate}>
                            <Plus className="w-4 h-4 mr-2" />
                            {createTemplate.title || 'Create'}
                        </button>
                    )}
                    {showRefreshButton && (
                        <button className="btn btn-sm border border-base-300 bg-base-100 hover:bg-base-200" onClick={handleRefresh}>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Refresh
                        </button>
                    )}
                </div>

                {/* Empty state card */}
                <div className="card bg-base-100 shadow-xl">
                    <div className="card-body items-center text-center py-12">
                        {emptyIcon && <div className="mb-4 text-base-content/50">{emptyIcon}</div>}
                        <h3 className="card-title">No Items</h3>
                        <p className="text-sm text-base-content/70 mb-6">{emptyMessage}</p>
                        {showCreateButton && createTemplate && (
                            <button className="btn border border-base-300 bg-base-100 hover:bg-base-200" onClick={handleCreate}>
                                <Plus className="w-4 h-4 mr-2" />
                                {createTemplate.title || 'Create First Item'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Page title */}
            {title && (
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
                </div>
            )}

            {/* Action toolbar */}
            <div className="flex items-center justify-between">
                {hasSelection ? (
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-base-content/70">
                            {selectedCount} item{selectedCount > 1 ? 's' : ''} selected
                        </span>
                        <button className="btn btn-ghost btn-xs" onClick={clearSelection}>
                            Clear
                        </button>
                    </div>
                ) : (
                    <div />
                )}

                <div className="flex items-center gap-2">
                    {hasSelection && canBulkDelete && (
                        <button className="btn btn-sm border border-base-300 bg-base-100 hover:bg-base-200" onClick={handleBulkDelete}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Selected
                        </button>
                    )}
                    {showCreateButton && createTemplate && (
                        <button className="btn btn-sm border border-base-300 bg-base-100 hover:bg-base-200" onClick={handleCreate}>
                            <Plus className="w-4 h-4 mr-2" />
                            {createTemplate.title || 'Create'}
                        </button>
                    )}
                    {showRefreshButton && (
                        <button className="btn btn-sm border border-base-300 bg-base-100 hover:bg-base-200" onClick={handleRefresh}>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Refresh
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="card bg-base-100 shadow-xl">
                <div className="overflow-x-auto">
                    <table className="table">
                        <thead>
                            <tr>
                                {/* Select all checkbox */}
                                {canBulkDelete && (
                                    <th className="w-12">
                                        <input
                                            type="checkbox"
                                            className="checkbox checkbox-sm"
                                            checked={allSelected}
                                            onChange={handleSelectAll}
                                            aria-label="Select all"
                                        />
                                    </th>
                                )}

                                {/* Column headers */}
                                {columns.map((col) => (
                                    <th key={col.key} style={{ width: col.width }}>
                                        {col.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item) => {
                                const itemId = item[detectedPrimaryKey];
                                const isItemSelectable = canBulkDelete && (!selectableFilter || selectableFilter(item));

                                return (
                                    <HalResourceRow
                                        key={itemId || Math.random()}
                                        item={item}
                                        columns={columns}
                                        showCheckboxColumn={canBulkDelete}
                                        selectable={isItemSelectable}
                                        selected={isSelected(itemId)}
                                        onToggleSelect={() => toggleSelection(itemId)}
                                        onRowClick={onRowClick}
                                        customRenderers={customRenderers}
                                    />
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
