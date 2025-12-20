import { Plus, RefreshCw, Trash, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useApiKeys } from '../hooks/use_api_keys';
import { ApiKeyRow } from './api_key_row';
import { ApiKeysTableSkeleton } from './api_keys_table_skeleton';
import { CreateApiKeyModal } from './create_api_key_modal';
import { PaginationControls } from '../../sessions/components/pagination_controls';
import { useSelection } from '../../../hooks/use_selection';
import { useExecuteTemplate } from '../../../hooks/use_hal_resource';
import { useConfirmDelete } from '../../../utils/confirm_delete';
import { useDisclosure } from '../../../hooks/use_disclosure';

/**
 * API Keys list component with HAL-FORMS template integration
 *
 * Features:
 * - Displays all API keys with usage and expiration information
 * - Visual warnings for keys expiring within 30 days
 * - Server-side pagination with configurable page sizes (10, 25, 50, 100)
 * - Template-driven create operation (button only shows if template exists)
 * - Template-driven bulk delete operations (checkbox selection)
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
        // someSelected, // unused but part of useSelection API
        hasSelection,
        count: selectedCount,
    } = useSelection(apiKeys as any[], 'apiKeyId');

    // Template execution for bulk delete
    const { execute: executeBulkDelete, loading: bulkDeleteLoading } = useExecuteTemplate(() => {
        clearSelection();
        refresh();
    });

    const { confirmDelete } = useConfirmDelete();

    const handleCreateModalClose = () => {
        closeCreateModal();
        refresh();
    };

    const createTemplate = data?._templates?.default; // HAL-FORMS standard: 'default' is the primary create template
    const bulkDeleteTemplate = data?._templates?.bulkDelete;

    // Handle bulk delete with confirmation
    const handleBulkDelete = () => {
        if (!bulkDeleteTemplate) return;

        confirmDelete({
            title: 'Delete API Keys',
            message: 'Are you sure you want to delete the selected API keys?',
            count: selectedCount,
            onConfirm: async () => {
                try {
                    await executeBulkDelete(bulkDeleteTemplate, {
                        apiKeyIds: selected,
                    });
                    toast.success(
                        `Successfully deleted ${selectedCount} API key${selectedCount === 1 ? '' : 's'}`
                    );
                } catch (err: any) {
                    toast.error(err.message || 'Failed to delete API keys');
                }
            },
        });
    };

    return (
        <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="card-title">API Keys</h2>
                    <div className="flex items-center gap-2">
                        {/* Bulk delete button shows only when items selected and template exists */}
                        {bulkDeleteTemplate && hasSelection && (
                            <button
                                className="btn btn-error btn-sm"
                                onClick={handleBulkDelete}
                                disabled={loading || bulkDeleteLoading}
                            >
                                <Trash className="h-4 w-4" />
                                Delete Selected ({selectedCount})
                            </button>
                        )}
                        {/* Create button only shows if template exists */}
                        {createTemplate && (
                            <button
                                className="btn btn-primary btn-sm"
                                onClick={openCreateModal}
                                disabled={loading}
                            >
                                <Plus className="h-4 w-4" />
                                {createTemplate.title || 'Create API Key'}
                            </button>
                        )}
                        <button
                            className="btn btn-ghost btn-sm btn-square"
                            onClick={refresh}
                            disabled={loading}
                            title="Refresh"
                        >
                            <RefreshCw className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Error Alert */}
                {error && (
                    <div className="alert alert-error">
                        <AlertCircle className="h-4 w-4" />
                        <div>
                            <h3 className="font-bold">Error</h3>
                            <div className="text-xs">{error}</div>
                        </div>
                    </div>
                )}

                {/* Loading Skeleton */}
                {loading && !apiKeys.length ? (
                    <ApiKeysTableSkeleton />
                ) : apiKeys.length === 0 ? (
                    <div className="alert">
                        <div>
                            <h3 className="font-bold">No API Keys</h3>
                            <div className="text-xs">
                                You don't have any API keys yet.
                                {createTemplate && ' Click "Create API Key" to get started.'}
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="table table-zebra">
                                <thead>
                                    <tr>
                                        {/* Checkbox column only shows if bulk delete template exists */}
                                        {bulkDeleteTemplate && (
                                            <th className="w-10">
                                                <input
                                                    type="checkbox"
                                                    className="checkbox"
                                                    checked={allSelected}
                                                    onChange={toggleAll}
                                                    disabled={loading}
                                                    aria-label="Select all"
                                                />
                                            </th>
                                        )}
                                        <th>Label</th>
                                        <th>API Key</th>
                                        <th>Created</th>
                                        <th>Expires</th>
                                        <th>Last Used</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {apiKeys.map((apiKey: any) => (
                                        <ApiKeyRow
                                            key={apiKey.apiKeyId}
                                            apiKey={apiKey}
                                            showCheckbox={!!bulkDeleteTemplate}
                                            selected={isSelected(apiKey.apiKeyId)}
                                            onToggleSelect={() => toggleSelection(apiKey.apiKeyId)}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <PaginationControls
                            pagination={pagination}
                            onNextPage={handleNextPage}
                            onPreviousPage={handlePreviousPage}
                            onPageSizeChange={handlePageSizeChange}
                        />
                    </>
                )}
            </div>

            {/* Create Modal */}
            <CreateApiKeyModal
                template={createTemplate}
                opened={createModalOpened}
                onClose={handleCreateModalClose}
            />
        </div>
    );
}
