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

import { Paper, Button, Table, Checkbox, Group, Text, Stack, Center } from '@mantine/core';
import { IconPlus, IconRefresh, IconTrash } from '@tabler/icons-react';
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
            <Stack gap="md">
                {/* Page title */}
                {title && (
                    <Stack gap={4}>
                        <Text size="xl" fw={700}>{title}</Text>
                    </Stack>
                )}

                {/* Action toolbar */}
                <Group justify="flex-end" gap="xs">
                    {showCreateButton && createTemplate && (
                        <Button variant="default" size="sm" onClick={handleCreate} leftSection={<IconPlus size={16} />}>
                            {createTemplate.title || 'Create'}
                        </Button>
                    )}
                    {showRefreshButton && (
                        <Button variant="default" size="sm" onClick={handleRefresh} leftSection={<IconRefresh size={16} />}>
                            Refresh
                        </Button>
                    )}
                </Group>

                {/* Empty state card */}
                <Paper p="xl" withBorder>
                    <Center>
                        <Stack align="center" gap="md" style={{ textAlign: 'center' }}>
                            {emptyIcon && <div style={{ color: 'var(--mantine-color-dimmed)' }}>{emptyIcon}</div>}
                            <Text size="lg" fw={600}>No Items</Text>
                            <Text size="sm" c="dimmed">{emptyMessage}</Text>
                            {showCreateButton && createTemplate && (
                                <Button onClick={handleCreate} leftSection={<IconPlus size={16} />}>
                                    {createTemplate.title || 'Create First Item'}
                                </Button>
                            )}
                        </Stack>
                    </Center>
                </Paper>
            </Stack>
        );
    }

    return (
        <Stack gap="md">
            {/* Page title */}
            {title && (
                <Stack gap={4}>
                    <Text size="xl" fw={700}>{title}</Text>
                </Stack>
            )}

            {/* Action toolbar */}
            <Group justify="space-between">
                {hasSelection ? (
                    <Group gap="md">
                        <Text size="sm" c="dimmed">
                            {selectedCount} item{selectedCount > 1 ? 's' : ''} selected
                        </Text>
                        <Button variant="subtle" size="xs" onClick={clearSelection}>
                            Clear
                        </Button>
                    </Group>
                ) : (
                    <div />
                )}

                <Group gap="xs">
                    {hasSelection && canBulkDelete && (
                        <Button variant="default" size="sm" onClick={handleBulkDelete} leftSection={<IconTrash size={16} />}>
                            Delete Selected
                        </Button>
                    )}
                    {showCreateButton && createTemplate && (
                        <Button variant="default" size="sm" onClick={handleCreate} leftSection={<IconPlus size={16} />}>
                            {createTemplate.title || 'Create'}
                        </Button>
                    )}
                    {showRefreshButton && (
                        <Button variant="default" size="sm" onClick={handleRefresh} leftSection={<IconRefresh size={16} />}>
                            Refresh
                        </Button>
                    )}
                </Group>
            </Group>

            {/* Table */}
            <Paper withBorder>
                <Table highlightOnHover>
                    <Table.Thead>
                        <Table.Tr>
                            {/* Select all checkbox */}
                            {canBulkDelete && (
                                <Table.Th w={60}>
                                    <Checkbox
                                        checked={allSelected}
                                        onChange={handleSelectAll}
                                        aria-label="Select all"
                                    />
                                </Table.Th>
                            )}

                            {/* Column headers */}
                            {columns.map((col) => (
                                <Table.Th key={col.key} style={{ width: col.width }}>
                                    {col.label}
                                </Table.Th>
                            ))}
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
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
                    </Table.Tbody>
                </Table>
            </Paper>
        </Stack>
    );
}
