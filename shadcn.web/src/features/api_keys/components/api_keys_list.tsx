import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Table,
    TableBody,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Plus, RefreshCw, Trash2, AlertCircle, Key } from 'lucide-react';
import { toast } from 'sonner';
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
 * API Keys list component matching svelte.web layout
 *
 * Features:
 * - Action buttons OUTSIDE the card
 * - Table INSIDE the card
 * - Pagination inside the card
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

    const [create_modal_opened, { open: open_create_modal, close: close_create_modal }] =
        useDisclosure(false);

    // Selection state for bulk operations
    const {
        selected,
        toggleSelection,
        toggleAll,
        clearSelection,
        isSelected,
        allSelected,
        hasSelection,
        count: selected_count,
    } = useSelection(apiKeys as any[], 'apiKeyId');

    // Template execution for bulk delete
    const { execute: execute_bulk_delete, loading: bulk_delete_loading } = useExecuteTemplate(() => {
        clearSelection();
        refresh();
    });

    const { confirmDelete } = useConfirmDelete();

    const handle_create_modal_close = () => {
        close_create_modal();
        refresh();
    };

    const create_template = data?._templates?.default;
    const bulk_delete_template = data?._templates?.bulkDelete;

    // Handle bulk delete with confirmation
    const handle_bulk_delete = () => {
        if (!bulk_delete_template) return;

        confirmDelete({
            title: 'Delete API Keys',
            message: `Are you sure you want to delete ${selected_count} API key${selected_count > 1 ? 's' : ''}? This action cannot be undone and will immediately revoke access.`,
            count: selected_count,
            onConfirm: async () => {
                try {
                    await execute_bulk_delete(bulk_delete_template, {
                        apiKeyIds: selected,
                    });
                    toast.success(
                        `Deleted ${selected_count} API key(s)`
                    );
                } catch (err: any) {
                    toast.error(err.message || 'Failed to delete API keys');
                }
            },
        });
    };

    return (
        <>
            {/* Actions Toolbar - OUTSIDE card */}
            <div className="flex items-center justify-between">
                {hasSelection ? (
                    <span className="text-sm font-medium">
                        {selected_count} key{selected_count > 1 ? 's' : ''} selected
                    </span>
                ) : (
                    <div></div>
                )}
                <div className="flex items-center gap-2">
                    {hasSelection && (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-9 px-4"
                                onClick={() => clearSelection()}
                            >
                                Clear Selection
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-9 px-4"
                                onClick={handle_bulk_delete}
                                disabled={bulk_delete_loading}
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Selected
                            </Button>
                        </>
                    )}
                    {create_template && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 px-4"
                            onClick={open_create_modal}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Create API Key
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-9 px-4"
                        onClick={refresh}
                        disabled={loading}
                    >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Error Alert */}
            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* API Keys Table - INSIDE card */}
            <Card>
                <CardContent className="p-0">
                    {loading && apiKeys.length === 0 ? (
                        <div className="p-6">
                            <ApiKeysTableSkeleton />
                        </div>
                    ) : apiKeys.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="rounded-full bg-muted p-4 mb-4">
                                <Key className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">No API Keys</h3>
                            <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                                You haven't created any API keys yet. Create one to get started with programmatic access.
                            </p>
                            {create_template && (
                                <Button onClick={open_create_modal}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create Your First API Key
                                </Button>
                            )}
                        </div>
                    ) : (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12">
                                            <Checkbox
                                                checked={allSelected}
                                                onCheckedChange={toggleAll}
                                                disabled={loading}
                                                aria-label="Select all API keys"
                                            />
                                        </TableHead>
                                        <TableHead className="w-[200px]">Label</TableHead>
                                        <TableHead className="min-w-[400px]">API Key</TableHead>
                                        <TableHead className="w-[150px]">Created</TableHead>
                                        <TableHead className="w-[150px]">Last Used</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {apiKeys.map((apiKey: any) => (
                                        <ApiKeyRow
                                            key={apiKey.apiKeyId}
                                            apiKey={apiKey}
                                            showCheckbox={true}
                                            selected={isSelected(apiKey.apiKeyId)}
                                            onToggleSelect={() => toggleSelection(apiKey.apiKeyId)}
                                        />
                                    ))}
                                </TableBody>
                            </Table>

                            {/* Pagination - inside card at bottom */}
                            {apiKeys.length > 0 && (
                                <div className="px-6 pb-6">
                                    <PaginationControls
                                        pagination={pagination}
                                        onNextPage={handleNextPage}
                                        onPreviousPage={handlePreviousPage}
                                        onPageSizeChange={handlePageSizeChange}
                                    />
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

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
