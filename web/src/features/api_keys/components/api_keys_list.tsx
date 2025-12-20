import { Alert, Button, Group, Paper, Stack, Table, Text, ActionIcon, Checkbox } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconPlus, IconRefresh, IconTrash } from '@tabler/icons-react';
import { useApiKeys } from '../hooks/use_api_keys';
import { ApiKeyRow } from './api_key_row';
import { ApiKeysTableSkeleton } from './api_keys_table_skeleton';
import { CreateApiKeyModal } from './create_api_key_modal';
import { PaginationControls } from '../../sessions/components/pagination_controls';
import { useSelection } from '../../../hooks/use_selection';
import { useExecuteTemplate } from '../../../hooks/use_hal_resource';
import { confirmDelete } from '../../../utils/confirm_delete';

/**
 * API Keys list component with HAL-FORMS template integration
 *
 * Features:
 * - Displays all API keys with usage and expiration information
 * - Visual warnings for keys expiring within 30 days
 * - Server-side pagination with configurable page sizes (10, 25, 50, 100)
 * - Template-driven create operation (button only shows if template exists)
 * - Template-driven delete operations (per-item)
 * - Loading and error states
 * - Refresh functionality
 *
 * Expiration color coding:
 * - Red badge: Expired keys
 * - Orange badge with warning icon: Expiring within 30 days
 * - Plain text: Normal expiration or never-expiring
 *
 * All operations are driven by HAL-FORMS templates from the API:
 * - Create button text comes from template.title
 * - Create form fields come from template.properties
 * - Delete operations use templates from each embedded API key
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
        data,
        apiKeys,
        loading,
        error,
        pagination,
        handleNextPage,
        handlePreviousPage,
        handlePageSizeChange,
        refresh,
    } = useApiKeys();

    const [createModalOpened, { open: openCreateModal, close: closeCreateModal }] =
        useDisclosure(false);

    // Selection state for bulk operations
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
    } = useSelection(apiKeys as any[], 'apiKeyId');

    // Template execution for bulk delete
    const { execute: executeBulkDelete, loading: bulkDeleteLoading } = useExecuteTemplate(
        () => {
            clearSelection();
            refresh();
        }
    );

    const handleCreateModalClose = () => {
        closeCreateModal();
        refresh();
    };

    const createTemplate = data?._templates?.create;
    const bulkDeleteTemplate = data?._templates?.bulkDelete;

    // Handle bulk delete with confirmation
    const handleBulkDelete = () => {
        if (!bulkDeleteTemplate) return;

        confirmDelete({
            title: 'Delete API Keys',
            message: 'Are you sure you want to delete the selected API keys?',
            count: selectedCount,
            onConfirm: async () => {
                await executeBulkDelete(bulkDeleteTemplate, {
                    apiKeyIds: selected
                });
            }
        });
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
                        {/* Create button only shows if template exists */}
                        {createTemplate && (
                            <Button
                                variant="filled"
                                leftSection={<IconPlus size={16} />}
                                onClick={openCreateModal}
                                disabled={loading}
                            >
                                {createTemplate.title || 'Create API Key'}
                            </Button>
                        )}
                        <ActionIcon
                            variant="subtle"
                            onClick={refresh}
                            disabled={loading}
                            title="Refresh"
                        >
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
                        {createTemplate && ' Click "Create API Key" to get started.'}
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
                                    <Table.Th>Label</Table.Th>
                                    <Table.Th>Key Prefix</Table.Th>
                                    <Table.Th>Created</Table.Th>
                                    <Table.Th>Expires</Table.Th>
                                    <Table.Th>Last Used</Table.Th>
                                    <Table.Th style={{ width: 100 }}>Actions</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {apiKeys.map((apiKey: any) => (
                                    <ApiKeyRow
                                        key={apiKey.apiKeyId}
                                        apiKey={apiKey}
                                        onDelete={refresh}
                                        showCheckbox={!!bulkDeleteTemplate}
                                        selected={isSelected(apiKey.apiKeyId)}
                                        onToggleSelect={() => toggleSelection(apiKey.apiKeyId)}
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
                        />
                    </>
                )}
            </Stack>

            {/* Create Modal */}
            <CreateApiKeyModal
                template={createTemplate}
                opened={createModalOpened}
                onClose={handleCreateModalClose}
            />
        </Paper>
    );
}
