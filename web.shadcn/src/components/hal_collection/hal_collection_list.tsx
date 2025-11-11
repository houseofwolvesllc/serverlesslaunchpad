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

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableHeader,
    TableHead,
    TableBody,
    TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useHalCollection, type ColumnConfig } from '@/hooks/use_hal_collection';
import { useSelection } from '@/hooks/use_selection';
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
    className?: string;
    selectableFilter?: (item: HalObject) => boolean;
    getRowClassName?: (item: HalObject) => string;
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
    className = '',
    selectableFilter,
    getRowClassName,
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
    } = useSelection(items, detectedPrimaryKey, selectableFilter);

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

    // Handle select all checkbox
    const handleSelectAll = () => {
        toggleAll();
    };

    // Empty state
    if (isEmpty) {
        return (
            <div className={`space-y-4 ${className}`}>
                {/* Toolbar for empty state */}
                <div className="flex items-center justify-between">
                    <div></div>
                    <div className="flex items-center gap-2">
                        {showCreateButton && createTemplate && (
                            <Button variant="outline" size="sm" onClick={handleCreate}>
                                <Plus className="mr-2 h-4 w-4" />
                                {createTemplate.title || 'Create'}
                            </Button>
                        )}
                        {showRefreshButton && (
                            <Button variant="outline" size="sm" onClick={handleRefresh}>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Refresh
                            </Button>
                        )}
                    </div>
                </div>

                {/* Empty state card */}
                <Card className="p-12">
                    <div className="flex flex-col items-center justify-center text-center">
                        {emptyIcon && <div className="mb-4 text-muted-foreground">{emptyIcon}</div>}
                        <h3 className="text-lg font-semibold mb-2">No Items</h3>
                        <p className="text-sm text-muted-foreground mb-6">{emptyMessage}</p>
                        {showCreateButton && createTemplate && (
                            <Button onClick={handleCreate}>
                                <Plus className="mr-2 h-4 w-4" />
                                {createTemplate.title || 'Create First Item'}
                            </Button>
                        )}
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Action Toolbar */}
            <div className="flex items-center justify-between">
                {hasSelection ? (
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-medium">
                            {selectedCount} item{selectedCount > 1 ? 's' : ''} selected
                        </span>
                        <Button variant="ghost" size="sm" onClick={clearSelection}>
                            Clear
                        </Button>
                    </div>
                ) : (
                    <div></div>
                )}

                <div className="flex items-center gap-2">
                    {hasSelection && canBulkDelete && (
                        <Button variant="outline" size="sm" onClick={handleBulkDelete}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Selected
                        </Button>
                    )}
                    {showCreateButton && createTemplate && (
                        <Button variant="outline" size="sm" onClick={handleCreate}>
                            <Plus className="mr-2 h-4 w-4" />
                            {createTemplate.title || 'Create'}
                        </Button>
                    )}
                    {showRefreshButton && (
                        <Button variant="outline" size="sm" onClick={handleRefresh}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Refresh
                        </Button>
                    )}
                </div>
            </div>

            {/* Table */}
            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            {/* Select all checkbox */}
                            {canBulkDelete && (
                                <TableHead className="w-12">
                                    <Checkbox
                                        checked={allSelected}
                                        onCheckedChange={handleSelectAll}
                                        aria-label="Select all"
                                    />
                                </TableHead>
                            )}

                            {/* Column headers */}
                            {columns.map((col) => (
                                <TableHead key={col.key} style={{ width: col.width }}>
                                    {col.label}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.map((item) => {
                            const itemId = item[detectedPrimaryKey];
                            const itemSelectable = canBulkDelete && (!selectableFilter || selectableFilter(item));

                            return (
                                <HalResourceRow
                                    key={itemId || Math.random()}
                                    item={item}
                                    columns={columns}
                                    selectable={itemSelectable}
                                    selected={isSelected(itemId)}
                                    onToggleSelect={() => toggleSelection(itemId)}
                                    onRowClick={onRowClick}
                                    customRenderers={customRenderers}
                                    getRowClassName={getRowClassName}
                                />
                            );
                        })}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}
