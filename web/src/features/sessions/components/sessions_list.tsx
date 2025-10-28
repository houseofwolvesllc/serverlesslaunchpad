import { ActionIcon, Alert, Button, Checkbox, Group, Paper, Stack, Table, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconRefresh, IconTrash } from '@tabler/icons-react';
import { useSessions } from '../hooks/use_sessions';
import { DeleteSessionsModal } from './delete_sessions_modal';
import { PaginationControls } from './pagination_controls';
import { SessionRow } from './session_row';
import { SessionsTableSkeleton } from './sessions_table_skeleton';

/**
 * Sessions list component with pagination and bulk deletion
 *
 * Features:
 * - Displays all active user sessions across devices
 * - Identifies and protects the current session (cannot be deleted)
 * - Server-side pagination with configurable page sizes (10, 25, 50, 100)
 * - Multi-select with bulk deletion
 * - Loading and error states
 * - Refresh functionality
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
        sessions,
        loading,
        error,
        selectedIds,
        currentSessionToken,
        pagination,
        handleSelectionChange,
        handleSelectAll,
        handleNextPage,
        handlePreviousPage,
        handlePageSizeChange,
        deleteSessions,
        refresh,
    } = useSessions();

    const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);

    const handleDeleteClick = () => {
        if (selectedIds.size === 0) return;
        openDeleteModal();
    };

    const handleDeleteConfirm = async () => {
        const sessionIds = Array.from(selectedIds);
        const result = await deleteSessions(sessionIds);

        if (result.success) {
            notifications.show({
                title: 'Success',
                message: `Deleted ${sessionIds.length} session${sessionIds.length > 1 ? 's' : ''}`,
                color: 'green',
            });
            closeDeleteModal();
        } else {
            notifications.show({
                title: 'Error',
                message: result.error || 'Failed to delete sessions',
                color: 'red',
            });
        }
    };

    // Calculate selectable sessions (exclude current session)
    const selectableSessions = sessions.filter((s) => s.sessionId !== currentSessionToken);
    const allSelectableSelected = selectableSessions.length > 0 && selectableSessions.every((s) => selectedIds.has(s.sessionId));
    const someSelected = selectedIds.size > 0 && !allSelectableSelected;

    const sessionsToDelete = sessions.filter((s) => selectedIds.has(s.sessionId));

    return (
        <Paper p="md" withBorder>
            <Stack gap="md">
                {/* Header */}
                <Group justify="space-between">
                    <Text size="lg" fw={600}>
                        Sessions
                    </Text>
                    <Group gap="sm">
                        <Button
                            variant="outline"
                            color="red"
                            leftSection={<IconTrash size={16} />}
                            onClick={handleDeleteClick}
                            disabled={selectedIds.size === 0 || loading}
                        >
                            Delete ({selectedIds.size})
                        </Button>
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
                                    <Table.Th style={{ width: 40 }}>
                                        <Checkbox
                                            checked={allSelectableSelected}
                                            indeterminate={someSelected}
                                            onChange={(event) => handleSelectAll(event.currentTarget.checked)}
                                            aria-label="Select all sessions on this page"
                                        />
                                    </Table.Th>
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
                                        isSelected={selectedIds.has(session.sessionId)}
                                        onSelectionChange={handleSelectionChange}
                                    />
                                ))}
                            </Table.Tbody>
                        </Table>

                        <PaginationControls
                            pagination={pagination}
                            onNextPage={handleNextPage}
                            onPreviousPage={handlePreviousPage}
                            onPageSizeChange={handlePageSizeChange}
                            disabled={loading}
                            itemLabel="sessions"
                        />
                    </>
                )}

                <DeleteSessionsModal
                    opened={deleteModalOpened}
                    onClose={closeDeleteModal}
                    sessions={sessionsToDelete}
                    onConfirm={handleDeleteConfirm}
                    loading={loading}
                />
            </Stack>
        </Paper>
    );
}
