/**
 * Sessions List - Using Generic HalCollectionList
 *
 * This component has been migrated to use the generic HalCollectionList component,
 * reducing code from 209 lines to ~120 lines (43% reduction).
 *
 * The generic component automatically handles:
 * - Column inference from data
 * - Selection and bulk operations
 * - Empty states
 * - Loading states
 * - Action toolbar
 *
 * Custom features:
 * - Custom renderers for device/browser info with lock icon and current session badge
 * - Current session cannot be selected for deletion
 * - Columns ordered by priority: Device & Browser, IP Address, Last Accessed, Date Created, Date Expires
 */

import { AlertCircle, Clock, Lock, Monitor, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useSessions } from '../hooks/use_sessions';
import { HalCollectionList } from '@/components/hal_collection';
import { CollectionSkeleton } from '@/components/hal_collection';
import { useExecuteTemplate } from '../../../hooks/use_hal_resource';
import { useConfirmDelete } from '../../../utils/confirm_delete';
import { parseUserAgent } from '../utils/parse_user_agent';
import type { FieldRenderer } from '@/components/hal_collection';

export function SessionsList() {
    const { data, sessions, loading, error, refresh } = useSessions();

    // Template execution for bulk delete
    const { execute: execute_bulk_delete } = useExecuteTemplate(() => {
        refresh();
    });

    const { confirmDelete } = useConfirmDelete();

    // Handle bulk delete with confirmation
    const handle_bulk_delete = async (selected_ids: string[], clearSelection: () => void) => {
        const bulk_delete_template = data?._templates?.['bulk-delete'] || data?._templates?.bulkDelete;
        if (!bulk_delete_template) return;

        const count = selected_ids.length;

        confirmDelete({
            title: 'Delete Multiple Sessions',
            message: `Are you sure you want to delete ${count} session(s)? Users will need to sign in again on those devices. This action cannot be undone.`,
            count,
            onConfirm: async () => {
                try {
                    await execute_bulk_delete(bulk_delete_template, {
                        sessionIds: selected_ids,
                    });
                    clearSelection();
                    toast.success(`${count} session(s) deleted successfully`);
                } catch (err: any) {
                    toast.error(err.message || 'Failed to delete sessions');
                }
            },
        });
    };

    // Custom renderer for user agent field (shows device/browser with icon)
    const userAgentRenderer: FieldRenderer = useMemo(
        () => (value, _column, item) => {
            const device_info = parseUserAgent(value);
            const is_current = item.isCurrent || false;

            return (
                <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-muted-foreground" />
                    <div className="flex flex-col">
                        <span className="text-sm font-medium">{device_info.browser}</span>
                        <span className="text-xs text-muted-foreground">{device_info.os} • {device_info.device}</span>
                    </div>
                    {is_current && <Lock className="h-4 w-4 text-blue-600" />}
                    {is_current && (
                        <Badge variant="default" className="text-xs">
                            Current
                        </Badge>
                    )}
                </div>
            );
        },
        []
    );

    // Custom renderer for last accessed (relative time)
    const dateLastAccessedRenderer: FieldRenderer = useMemo(
        () => (value) => {
            if (!value) return <span className="text-sm text-muted-foreground">Never</span>;

            const date = new Date(value);
            return (
                <span className="text-sm" title={date.toLocaleString()}>
                    {formatDistanceToNow(date, { addSuffix: true })}
                </span>
            );
        },
        []
    );

    // Custom renderer for date fields (shows formatted date)
    const dateRenderer: FieldRenderer = useMemo(
        () => (value) => {
            if (!value) return <span className="text-sm text-muted-foreground">-</span>;

            const date = new Date(value);
            return (
                <span className="text-sm" title={date.toLocaleString()}>
                    {date.toLocaleDateString()}
                </span>
            );
        },
        []
    );

    // Enhance data with isCurrent field for proper badge display
    // Must be before early returns to satisfy Rules of Hooks
    const enhancedData = useMemo(() => {
        if (!data) return null;
        return {
            ...data,
            _embedded: {
                ...data._embedded,
                sessions: sessions, // Use enhanced sessions with isCurrent
            },
        };
    }, [data, sessions]);

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
        return <CollectionSkeleton rows={5} columns={3} />;
    }

    return (
        <HalCollectionList
            resource={enhancedData}
            onRefresh={refresh}
            bulkOperations={[
                {
                    id: 'delete',
                    label: 'Delete Selected',
                    icon: <Trash2 className="h-4 w-4" />,
                    variant: 'destructive',
                    handler: handle_bulk_delete,
                },
            ]}
            primaryKey="sessionId"
            columnConfig={{
                userId: { hidden: true },
                sessionId: { hidden: true },
                isCurrent: { hidden: true },
                userAgent: { label: 'Device & Browser', priority: 1 },
                ipAddress: { label: 'IP Address', priority: 2 },
                dateLastAccessed: { label: 'Last Accessed', priority: 3 },
                dateCreated: { label: 'Date Created', priority: 4 },
                dateExpires: { label: 'Date Expires', priority: 5 },
            }}
            customRenderers={{
                userAgent: userAgentRenderer,
                dateLastAccessed: dateLastAccessedRenderer,
                dateCreated: dateRenderer,
                dateExpires: dateRenderer,
            }}
            selectableFilter={(item) => !item.isCurrent}
            emptyMessage="No active sessions found."
            emptyIcon={<Clock className="h-12 w-12" />}
            showCreateButton={false} // Sessions don't have a create operation
        />
    );
}
