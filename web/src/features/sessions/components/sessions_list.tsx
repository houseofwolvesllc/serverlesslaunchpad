import { Alert, Button, Group, Paper, Stack, Table, Text, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconRefresh } from '@tabler/icons-react';
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
        const sessionTokens = Array.from(selectedIds);
        const result = await deleteSessions(sessionTokens);

        if (result.success) {
            notifications.show({
                title: 'Success',
                message: `Deleted ${sessionTokens.length} session${sessionTokens.length > 1 ? 's' : ''}`,
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

    const allSelectableSelected =
        sessions.length > 0 &&
        sessions.filter((s) => s.sessionToken !== currentSessionToken).every((s) => selectedIds.has(s.sessionToken));

    const sessionsToDelete = sessions.filter((s) => selectedIds.has(s.sessionToken));

    return (
        <Paper p="md" shadow="sm">
            <Stack gap="md">
                <Group justify="space-between">
                    <Title order={2}>Sessions</Title>
                    <Button
                        leftSection={<IconRefresh size={16} />}
                        variant="subtle"
                        onClick={refresh}
                        loading={loading}
                    >
                        Refresh
                    </Button>
                </Group>

                {error && (
                    <Alert icon={<IconAlertCircle size={16} />} color="red" title="Error">
                        {error}
                    </Alert>
                )}

                <Group justify="space-between">
                    <Group>
                        <input
                            type="checkbox"
                            checked={allSelectableSelected}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            disabled={loading || sessions.length === 0}
                            style={{ cursor: 'pointer' }}
                            aria-label="Select all sessions on this page"
                        />
                        <Text size="sm">Select All</Text>
                    </Group>
                    <Button color="red" disabled={selectedIds.size === 0 || loading} onClick={handleDeleteClick}>
                        Delete Selected ({selectedIds.size})
                    </Button>
                </Group>

                {loading && sessions.length === 0 ? (
                    <SessionsTableSkeleton />
                ) : sessions.length === 0 ? (
                    <Text c="dimmed" ta="center" py="xl">
                        No sessions found
                    </Text>
                ) : (
                    <>
                        <Table highlightOnHover>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th style={{ width: 40 }}></Table.Th>
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
