import { RefreshCw, Trash, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Table,
    TableBody,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useSessions } from '../hooks/use_sessions';
import { PaginationControls } from './pagination_controls';
import { SessionRow } from './session_row';
import { SessionsTableSkeleton } from './sessions_table_skeleton';
import { useSelection } from '../../../hooks/use_selection';
import { useExecuteTemplate } from '../../../hooks/use_hal_resource';
import { useConfirmDelete } from '../../../utils/confirm_delete';

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
    const { confirmDelete } = useConfirmDelete();

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
                        sessionIds: selected,
                    });
                    toast.success(
                        `Successfully deleted ${selectedCount} session${selectedCount === 1 ? '' : 's'}`
                    );
                } catch (err: any) {
                    toast.error(err.message || 'Failed to delete sessions');
                }
            },
        });
    };

    return (
        <Card className="p-6">
            <div className="flex flex-col space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Sessions</h2>
                    <div className="flex items-center gap-2">
                        {/* Bulk delete button shows only when items selected and template exists */}
                        {bulkDeleteTemplate && hasSelection && (
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={handleBulkDelete}
                                disabled={loading || bulkDeleteLoading}
                            >
                                <Trash className="mr-2 h-4 w-4" />
                                Delete Selected ({selectedCount})
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={refresh}
                            disabled={loading}
                            title="Refresh"
                        >
                            <RefreshCw className="h-4 w-4" />
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

                {/* Loading Skeleton */}
                {loading && sessions.length === 0 ? (
                    <SessionsTableSkeleton />
                ) : sessions.length === 0 ? (
                    <Alert>
                        <AlertTitle>No Sessions</AlertTitle>
                        <AlertDescription>No sessions found.</AlertDescription>
                    </Alert>
                ) : (
                    <>
                        {/* Table */}
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        {/* Checkbox column only shows if bulk delete template exists */}
                                        {bulkDeleteTemplate && (
                                            <TableHead className="w-10">
                                                <Checkbox
                                                    checked={allSelected}
                                                    onCheckedChange={toggleAll}
                                                    disabled={loading}
                                                    aria-label="Select all"
                                                    className={
                                                        someSelected && !allSelected
                                                            ? 'data-[state=checked]:bg-primary'
                                                            : ''
                                                    }
                                                />
                                            </TableHead>
                                        )}
                                        <TableHead>Device</TableHead>
                                        <TableHead>IP Address</TableHead>
                                        <TableHead>Last Access</TableHead>
                                        <TableHead>Created</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sessions.map((session) => (
                                        <SessionRow
                                            key={session.sessionId}
                                            session={session}
                                            showCheckbox={!!bulkDeleteTemplate}
                                            selected={isSelected(session.sessionId)}
                                            onToggleSelect={() => toggleSelection(session.sessionId)}
                                        />
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        <PaginationControls
                            pagination={pagination}
                            onNextPage={handleNextPage}
                            onPreviousPage={handlePreviousPage}
                            onPageSizeChange={handlePageSizeChange}
                        />
                    </>
                )}
            </div>
        </Card>
    );
}
