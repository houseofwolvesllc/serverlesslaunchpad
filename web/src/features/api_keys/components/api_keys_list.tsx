import { useState } from 'react';
import { ActionIcon, Alert, Button, Checkbox, Group, Paper, Stack, Table, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconRefresh, IconTrash } from '@tabler/icons-react';
import { useApiKeys } from '../hooks/use_api_keys';
import { ApiKeyRow } from './api_key_row';
import { ApiKeysTableSkeleton } from './api_keys_table_skeleton';
import { CreateApiKeyModal } from './create_api_key_modal';
import { DeleteApiKeysModal } from './delete_api_keys_modal';
import { PaginationControls } from '../../sessions/components/pagination_controls';

/**
 * API Keys list component with pagination and bulk deletion
 *
 * Features:
 * - Displays all API keys with usage and expiration information
 * - Visual warnings for keys expiring within 30 days
 * - Server-side pagination with configurable page sizes (10, 25, 50, 100)
 * - Multi-select with bulk deletion
 * - Loading and error states
 * - Refresh functionality
 *
 * Expiration color coding:
 * - Red badge: Expired keys
 * - Orange badge with warning icon: Expiring within 30 days
 * - Plain text: Normal expiration or never-expiring
 *
 * @example
 * ```tsx
 * import { ApiKeysList } from './features/api_keys';
 *
 * function ApiKeysPage() {
 *   return <ApiKeysList />;
 * }
 * ```
 */
export function ApiKeysList() {
    const {
        apiKeys,
        loading,
        error,
        selectedIds,
        pagination,
        handleSelectionChange,
        handleSelectAll,
        handleNextPage,
        handlePreviousPage,
        handlePageSizeChange,
        deleteApiKeys,
        refresh,
    } = useApiKeys();

    const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
    const [createModalOpened, { open: openCreateModal, close: closeCreateModal }] = useDisclosure(false);
    const [deleting, setDeleting] = useState(false);

    const selectedApiKeys = apiKeys.filter((key) => selectedIds.has(key.apiKeyId));
    const allOnPageSelected = apiKeys.length > 0 && apiKeys.every((key) => selectedIds.has(key.apiKeyId));
    const someSelected = selectedIds.size > 0 && !allOnPageSelected;

    const handleDeleteClick = () => {
        if (selectedIds.size === 0) return;
        openDeleteModal();
    };

    const handleCreateModalClose = () => {
        closeCreateModal();
        refresh();
    };

    const handleDeleteConfirm = async () => {
        setDeleting(true);
        const result = await deleteApiKeys(Array.from(selectedIds));
        setDeleting(false);

        if (result.success) {
            notifications.show({
                title: 'Success',
                message: `Deleted ${selectedIds.size} API key${selectedIds.size !== 1 ? 's' : ''}`,
                color: 'green',
            });
            closeDeleteModal();
        } else {
            notifications.show({
                title: 'Error',
                message: result.error || 'Failed to delete API keys',
                color: 'red',
            });
        }
    };

    return (
        <Paper p="md" withBorder>
            <Stack gap="md">
                {/* Header */}
                <Group justify="space-between">
                    <Text size="lg" fw={600}>
                        API Keys
                    </Text>
                    <Group gap="sm">
                        <Button
                            variant="filled"
                            leftSection={<IconPlus size={16} />}
                            onClick={openCreateModal}
                            disabled={loading}
                        >
                            Create API Key
                        </Button>
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
                {loading && !apiKeys.length ? (
                    <ApiKeysTableSkeleton />
                ) : apiKeys.length === 0 ? (
                    <Alert color="blue" title="No API Keys">
                        You don't have any API keys yet.
                    </Alert>
                ) : (
                    <>
                        {/* Table */}
                        <Table>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th style={{ width: 40 }}>
                                        <Checkbox
                                            checked={allOnPageSelected}
                                            indeterminate={someSelected}
                                            onChange={(event) => handleSelectAll(event.currentTarget.checked)}
                                            aria-label="Select all API keys on this page"
                                        />
                                    </Table.Th>
                                    <Table.Th>Label</Table.Th>
                                    <Table.Th>API Key</Table.Th>
                                    <Table.Th>Last Used</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {apiKeys.map((apiKey) => (
                                    <ApiKeyRow
                                        key={apiKey.apiKeyId}
                                        apiKey={apiKey}
                                        selected={selectedIds.has(apiKey.apiKeyId)}
                                        onSelectionChange={handleSelectionChange}
                                    />
                                ))}
                            </Table.Tbody>
                        </Table>

                        {/* Pagination */}
                        <PaginationControls
                            pagination={pagination}
                            onNextPage={handleNextPage}
                            onPreviousPage={handlePreviousPage}
                            onPageSizeChange={handlePageSizeChange}
                            disabled={loading}
                            itemLabel="API keys"
                        />
                    </>
                )}

                {/* Create API Key Modal */}
                <CreateApiKeyModal opened={createModalOpened} onClose={handleCreateModalClose} />

                {/* Delete Confirmation Modal */}
                <DeleteApiKeysModal
                    opened={deleteModalOpened}
                    onClose={closeDeleteModal}
                    apiKeys={selectedApiKeys}
                    onConfirm={handleDeleteConfirm}
                    loading={deleting}
                />
            </Stack>
        </Paper>
    );
}
