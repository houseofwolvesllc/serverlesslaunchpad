import { Key, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useApiKeys } from '../hooks/use_api_keys';
import { CreateApiKeyModal } from './create_api_key_modal';
import { useExecuteTemplate } from '../../../hooks/use_hal_resource';
import { useConfirmDelete } from '../../../utils/confirm_delete';
import { useDisclosure } from '../../../hooks/use_disclosure';
import { HalCollectionList } from '../../../components/hal_collection';

/**
 * API Keys list component with HAL-FORMS template integration
 *
 * Features:
 * - Displays all API keys with usage and expiration information
 * - Template-driven create operation (button only shows if template exists)
 * - Template-driven bulk delete operations (checkbox selection)
 * - Loading and error states
 * - Refresh functionality
 *
 * All operations are driven by HAL-FORMS templates from the API:
 * - Create button text comes from template.title
 * - Create form fields come from template.properties
 * - Bulk delete uses the bulkDelete template from the collection
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

    const { confirmDelete } = useConfirmDelete();

    const handleCreateModalClose = () => {
        closeCreateModal();
        refresh();
    };

    const createTemplate = data?._templates?.create || data?._templates?.default; // Try 'create' first, fallback to 'default'

    // Handle bulk delete with confirmation
    const handleBulkDelete = async (selectedIds: string[], clearSelection: () => void) => {
        const bulkDeleteTemplate = data?._templates?.['bulk-delete'] || data?._templates?.bulkDelete;
        if (!bulkDeleteTemplate) return;

        const count = selectedIds.length;
        confirmDelete({
            title: 'Delete API Keys',
            message: `Are you sure you want to delete ${count} API key${count > 1 ? 's' : ''}?`,
            count,
            onConfirm: async () => {
                await executeBulkDelete(bulkDeleteTemplate, {
                    apiKeyIds: selectedIds,
                });
                clearSelection();
                toast.success(`Successfully deleted ${count} API key${count === 1 ? '' : 's'}`);
            },
        });
    };

    return (
        <>
            <HalCollectionList
                resource={data}
                onRefresh={refresh}
                onCreate={openCreateModal}
                bulkOperations={[
                    {
                        id: 'delete',
                        label: 'Delete Selected',
                        icon: <Trash2 className="w-4 h-4" />,
                        variant: 'destructive',
                        handler: handleBulkDelete,
                    },
                ]}
                primaryKey="apiKeyId"
                columnConfig={{
                    dateLastUsed: { nullText: 'Never' },
                }}
                emptyMessage="You haven't created any API keys yet."
                emptyIcon={<Key className="w-12 h-12" />}
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
