/**
 * API Keys List - Using Generic HalCollectionList
 *
 * This component has been migrated to use the generic HalCollectionList component,
 * reducing code from 248 lines to ~80 lines (68% reduction).
 *
 * The generic component automatically handles:
 * - Column inference from data
 * - Selection and bulk operations
 * - Empty states
 * - Loading states
 * - Action toolbar
 */

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Key } from 'lucide-react';
import { toast } from 'sonner';
import { useApiKeys } from '../hooks/use_api_keys';
import { HalCollectionList } from '@/components/hal_collection';
import { CollectionSkeleton } from '@/components/hal_collection';
import { CreateApiKeyModal } from './create_api_key_modal';
import { useExecuteTemplate } from '../../../hooks/use_hal_resource';
import { useConfirmDelete } from '../../../utils/confirm_delete';
import { useDisclosure } from '../../../hooks/use_disclosure';

export function ApiKeysList() {
    const { data, loading, error, refresh } = useApiKeys();

    const [create_modal_opened, { open: open_create_modal, close: close_create_modal }] =
        useDisclosure(false);

    // Template execution for bulk delete
    const { execute: execute_bulk_delete } = useExecuteTemplate(() => {
        refresh();
    });

    const { confirmDelete } = useConfirmDelete();

    const create_template = data?._templates?.create || data?._templates?.default;

    // Handle bulk delete with confirmation
    const handle_bulk_delete = async (selected_ids: string[]) => {
        const bulk_delete_template = data?._templates?.['bulk-delete'] || data?._templates?.bulkDelete;
        if (!bulk_delete_template) return;

        const count = selected_ids.length;

        confirmDelete({
            title: 'Delete API Keys',
            message: `Are you sure you want to delete ${count} API key${count > 1 ? 's' : ''}? This action cannot be undone and will immediately revoke access.`,
            count,
            onConfirm: async () => {
                try {
                    await execute_bulk_delete(bulk_delete_template, {
                        apiKeyIds: selected_ids,
                    });
                    toast.success(`Deleted ${count} API key(s)`);
                } catch (err: any) {
                    toast.error(err.message || 'Failed to delete API keys');
                }
            },
        });
    };

    const handle_create_modal_close = () => {
        close_create_modal();
        refresh();
    };

    // Error Alert
    if (error) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        );
    }

    // Loading state
    if (loading && !data) {
        return <CollectionSkeleton rows={5} columns={4} />;
    }

    return (
        <>
            <HalCollectionList
                resource={data}
                onRefresh={refresh}
                onCreate={open_create_modal}
                onBulkDelete={handle_bulk_delete}
                primaryKey="apiKeyId"
                columnConfig={{
                    userId: { hidden: true },
                    apiKeyId: { hidden: true },
                    dateLastUsed: { nullText: 'Never' },
                }}
                emptyMessage="You haven't created any API keys yet. Create one to get started with programmatic access."
                emptyIcon={<Key className="h-12 w-12" />}
            />

            {/* Create Modal */}
            {create_template && (
                <CreateApiKeyModal
                    template={create_template}
                    opened={create_modal_opened}
                    onClose={handle_create_modal_close}
                />
            )}
        </>
    );
}
