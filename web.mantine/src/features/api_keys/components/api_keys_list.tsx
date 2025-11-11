import { useDisclosure } from '@mantine/hooks';
import { IconKey } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useApiKeys } from '../hooks/use_api_keys';
import { HalCollectionList } from '../../../components/hal_collection';
import { CreateApiKeyModal } from './create_api_key_modal';
import { useExecuteTemplate } from '../../../hooks/use_hal_resource';
import { confirmDelete } from '../../../utils/confirm_delete';

/**
 * API Keys list component with HAL-FORMS template integration
 *
 * Uses the generic HalCollectionList component for automatic rendering.
 * All operations are driven by HAL-FORMS templates from the API.
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
    const { data, refresh } = useApiKeys();

    const [createModalOpened, { open: openCreateModal, close: closeCreateModal }] =
        useDisclosure(false);

    // Template execution for bulk delete
    const { execute: executeBulkDelete } = useExecuteTemplate(() => {
        refresh();
    });

    const handleCreateModalClose = () => {
        closeCreateModal();
        refresh();
    };

    const createTemplate = data?._templates?.default;
    const bulkDeleteTemplate = data?._templates?.bulkDelete;

    // Handle bulk delete with confirmation
    const handleBulkDelete = async (selectedIds: string[]) => {
        if (!bulkDeleteTemplate) return;

        const count = selectedIds.length;

        confirmDelete({
            title: 'Delete API Keys',
            message: `Are you sure you want to delete ${count} API key${count > 1 ? 's' : ''}?`,
            count,
            onConfirm: async () => {
                try {
                    await executeBulkDelete(bulkDeleteTemplate, {
                        apiKeyIds: selectedIds
                    });
                    notifications.show({
                        title: 'Success',
                        message: `Successfully deleted ${count} API key${count === 1 ? '' : 's'}`,
                        color: 'green',
                    });
                } catch (err: any) {
                    notifications.show({
                        title: 'Error',
                        message: err.message || 'Failed to delete API keys',
                        color: 'red',
                    });
                }
            }
        });
    };

    return (
        <>
            <HalCollectionList
                resource={data}
                onRefresh={refresh}
                onCreate={openCreateModal}
                onBulkDelete={handleBulkDelete}
                primaryKey="apiKeyId"
                columnConfig={{
                    dateLastUsed: { nullText: 'Never' }
                }}
                emptyMessage="You haven't created any API keys yet."
                emptyIcon={<IconKey size={48} />}
            />

            {/* Create Modal */}
            {createTemplate && (
                <CreateApiKeyModal
                    template={createTemplate}
                    opened={createModalOpened}
                    onClose={handleCreateModalClose}
                />
            )}
        </>
    );
}
