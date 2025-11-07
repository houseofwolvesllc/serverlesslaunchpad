import { RefreshCw, Trash2, AlertCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
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
import { useSessions } from '../hooks/use_sessions';
import { PaginationControls } from './pagination_controls';
import { SessionRow } from './session_row';
import { SessionsTableSkeleton } from './sessions_table_skeleton';
import { useSelection } from '../../../hooks/use_selection';
import { useExecuteTemplate } from '../../../hooks/use_hal_resource';
import { useConfirmDelete } from '../../../utils/confirm_delete';

/**
 * Sessions list component matching svelte.web layout
 *
 * Features:
 * - Action buttons OUTSIDE the card
 * - Table INSIDE the card
 * - Pagination inside the card
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
    const {
        selected,
        toggleSelection,
        toggleAll,
        clearSelection,
        isSelected,
        allSelected,
        hasSelection,
        count: selected_count
    } = useSelection(sessions, 'sessionId', (session: any) => !session.isCurrent);

    // Template execution for bulk delete
    const { execute: execute_bulk_delete, loading: bulk_delete_loading } = useExecuteTemplate(
        () => {
            clearSelection();
            refresh();
        }
    );

    const bulk_delete_template = data?._templates?.bulkDelete;
    const { confirmDelete } = useConfirmDelete();

    // Handle bulk delete with confirmation
    const handle_bulk_delete = () => {
        if (!bulk_delete_template) return;

        confirmDelete({
            title: 'Delete Multiple Sessions',
            message: `Are you sure you want to delete ${selected_count} session(s)? Users will need to sign in again on those devices. This action cannot be undone.`,
            count: selected_count,
            onConfirm: async () => {
                try {
                    await execute_bulk_delete(bulk_delete_template, {
                        sessionIds: selected,
                    });
                    toast.success(
                        `${selected_count} session(s) deleted successfully`
                    );
                } catch (err: any) {
                    toast.error(err.message || 'Failed to delete sessions');
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
                        {selected_count} session(s) selected
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
                            {bulk_delete_template && (
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
                            )}
                        </>
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

            {/* Sessions Table - INSIDE card */}
            {loading && sessions.length === 0 ? (
                <Card>
                    <CardContent className="p-6">
                        <SessionsTableSkeleton />
                    </CardContent>
                </Card>
            ) : sessions.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No Sessions</h3>
                        <p className="text-sm text-muted-foreground">No active sessions found.</p>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">
                                    <Checkbox
                                        checked={allSelected}
                                        onCheckedChange={toggleAll}
                                        disabled={loading}
                                        aria-label="Select all sessions"
                                    />
                                </TableHead>
                                <TableHead>Device & Browser</TableHead>
                                <TableHead>IP Address</TableHead>
                                <TableHead>Last Accessed</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sessions.map((session) => (
                                <SessionRow
                                    key={session.sessionId}
                                    session={session}
                                    showCheckbox={true}
                                    selected={isSelected(session.sessionId)}
                                    onToggleSelect={() => toggleSelection(session.sessionId)}
                                />
                            ))}
                        </TableBody>
                    </Table>

                    {/* Pagination - inside card at bottom */}
                    {sessions.length > 0 && (
                        <div className="px-6 pb-6">
                            <PaginationControls
                                pagination={pagination}
                                onNextPage={handleNextPage}
                                onPreviousPage={handlePreviousPage}
                                onPageSizeChange={handlePageSizeChange}
                            />
                        </div>
                    )}
                </Card>
            )}
        </>
    );
}
