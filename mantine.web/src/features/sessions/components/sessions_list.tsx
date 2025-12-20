import { ActionIcon, Alert, Button, Checkbox, Group, Paper, Stack, Table, Text } from '@mantine/core';
import { IconRefresh, IconTrash } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useSessions } from '../hooks/use_sessions';
import { PaginationControls } from './pagination_controls';
import { SessionRow } from './session_row';
import { SessionsTableSkeleton } from './sessions_table_skeleton';
import { useSelection } from '../../../hooks/use_selection';
import { useExecuteTemplate } from '../../../hooks/use_hal_resource';
import { confirmDelete } from '../../../utils/confirm_delete';

/**
 * Sessions list component with HAL-FORMS template integration
 *
 * Features:
 * - Displays all active user sessions across devices
 * - Identifies and protects the current session (cannot be deleted)
 * - Server-side pagination with configurable page sizes (10, 25, 50, 100)
 * - Template-driven bulk delete operations (checkbox selection)
 * - Loading and error states
 * - Refresh functionality
 *
 * All operations are driven by HAL-FORMS templates from the API:
 * - Bulk delete uses the bulkDelete template from the collection
 *
 * @example
 * ```tsx
 * import { SessionsList } from './features/sessions';
 *
 * function AccountSecurityPage() {
 *   return <SessionsList />;
 * }
 * ```
 */
export function SessionsList() {
    const {
        data,
        sessions,
        loading,
        error,
        pagination,
        handleNextPage,
        handlePreviousPage,
        handlePageSizeChange,
        refresh,
    } = useSessions();

    // Selection state for bulk operations
    // Filter out current session - it cannot be deleted
    const {
        selected,
        toggleSelection,
        toggleAll,
        clearSelection,
        isSelected,
        allSelected,
        someSelected,
        hasSelection,
        count: selectedCount
    } = useSelection(sessions, 'sessionId', (session: any) => !session.isCurrent);

    // Template execution for bulk delete
    const { execute: executeBulkDelete, loading: bulkDeleteLoading } = useExecuteTemplate(
        () => {
            clearSelection();
            refresh();
        }
    );

    const bulkDeleteTemplate = data?._templates?.bulkDelete;

    // Handle bulk delete with confirmation
    const handleBulkDelete = () => {
        if (!bulkDeleteTemplate) return;

        confirmDelete({
            title: 'Delete Sessions',
            message: 'Are you sure you want to delete the selected sessions?',
            count: selectedCount,
            onConfirm: async () => {
                try {
                    await executeBulkDelete(bulkDeleteTemplate, {
                        sessionIds: selected
                    });
                    notifications.show({
                        title: 'Success',
                        message: `Successfully deleted ${selectedCount} session${selectedCount === 1 ? '' : 's'}`,
                        color: 'green',
                    });
                } catch (err: any) {
                    notifications.show({
                        title: 'Error',
                        message: err.message || 'Failed to delete sessions',
                        color: 'red',
                    });
                }
            }
        });
    };

    return (
        <Paper p="md" withBorder>
            <Stack gap="md">
                {/* Header */}
                <Group justify="space-between">
                    <Text size="lg" fw={600}>
                        Sessions
                    </Text>
                    <Group gap="sm">
                        {/* Bulk delete button shows only when items selected and template exists */}
                        {bulkDeleteTemplate && hasSelection && (
                            <Button
                                color="red"
                                variant="light"
                                leftSection={<IconTrash size={16} />}
                                onClick={handleBulkDelete}
                                disabled={loading || bulkDeleteLoading}
                            >
                                Delete Selected ({selectedCount})
                            </Button>
                        )}
                        <ActionIcon variant="subtle" onClick={refresh} disabled={loading} title="Refresh">
                            <IconRefresh size={18} />
                        </ActionIcon>
                    </Group>
                </Group>

                {/* Error Alert */}
                {error && (
                    <Alert color="red" title="Error">
                        {error}
                    </Alert>
                )}

                {/* Loading Skeleton */}
                {loading && sessions.length === 0 ? (
                    <SessionsTableSkeleton />
                ) : sessions.length === 0 ? (
                    <Alert color="blue" title="No Sessions">
                        No sessions found.
                    </Alert>
                ) : (
                    <>
                        {/* Table */}
                        <Table>
                            <Table.Thead>
                                <Table.Tr>
                                    {/* Checkbox column only shows if bulk delete template exists */}
                                    {bulkDeleteTemplate && (
                                        <Table.Th style={{ width: 40 }}>
                                            <Checkbox
                                                checked={allSelected}
                                                indeterminate={someSelected}
                                                onChange={toggleAll}
                                                disabled={loading}
                                                aria-label="Select all"
                                            />
                                        </Table.Th>
                                    )}
                                    <Table.Th>Device</Table.Th>
                                    <Table.Th>IP Address</Table.Th>
                                    <Table.Th>Last Access</Table.Th>
                                    <Table.Th>Created</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {sessions.map((session) => (
                                    <SessionRow
                                        key={session.sessionId}
                                        session={session}
                                        showCheckbox={!!bulkDeleteTemplate}
                                        selected={isSelected(session.sessionId)}
                                        onToggleSelect={() => toggleSelection(session.sessionId)}
                                    />
                                ))}
                            </Table.Tbody>
                        </Table>

                        <PaginationControls
                            pagination={pagination}
                            onNextPage={handleNextPage}
                            onPreviousPage={handlePreviousPage}
                            onPageSizeChange={handlePageSizeChange}
                        />
                    </>
                )}
            </Stack>
        </Paper>
    );
}
