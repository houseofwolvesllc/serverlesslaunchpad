import { RefreshCw, Trash, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
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
        // someSelected, // unused but part of useSelection API
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
        <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="card-title">Sessions</h2>
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
                {loading && sessions.length === 0 ? (
                    <SessionsTableSkeleton />
                ) : sessions.length === 0 ? (
                    <div className="alert">
                        <div>
                            <h3 className="font-bold">No Sessions</h3>
                            <div className="text-xs">No sessions found.</div>
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
                                        <th>Device</th>
                                        <th>IP Address</th>
                                        <th>Last Access</th>
                                        <th>Created</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sessions.map((session) => (
                                        <SessionRow
                                            key={session.sessionId}
                                            session={session}
                                            showCheckbox={!!bulkDeleteTemplate}
                                            selected={isSelected(session.sessionId)}
                                            onToggleSelect={() => toggleSelection(session.sessionId)}
                                        />
                                    ))}
                                </tbody>
                            </table>
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
        </div>
    );
}
