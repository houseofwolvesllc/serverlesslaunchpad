import { Clock, Monitor } from 'lucide-react';
import { useMemo } from 'react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { useSessions } from '../hooks/use_sessions';
import { useExecuteTemplate } from '../../../hooks/use_hal_resource';
import { useConfirmDelete } from '../../../utils/confirm_delete';
import { HalCollectionList, type FieldRenderer } from '../../../components/hal_collection';
import { parseUserAgent } from '../utils/parse_user_agent';

/**
 * Sessions list component with HAL-FORMS template integration
 *
 * Features:
 * - Displays all active user sessions across devices
 * - Identifies and protects the current session (cannot be deleted)
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
    const { data, refresh } = useSessions();

    // Template execution for bulk delete
    const { execute: execute_bulk_delete } = useExecuteTemplate(() => {
        refresh();
    });

    const { confirmDelete } = useConfirmDelete();

    // Handle bulk delete with confirmation
    const handle_bulk_delete = async (selectedIds: string[]) => {
        const bulkDeleteTemplate = data?._templates?.bulkDelete;
        if (!bulkDeleteTemplate) return;

        const count = selectedIds.length;
        confirmDelete({
            title: 'Delete Sessions',
            message: `Are you sure you want to delete ${count} session${count > 1 ? 's' : ''}?`,
            count,
            onConfirm: async () => {
                await execute_bulk_delete(bulkDeleteTemplate, {
                    sessionIds: selectedIds,
                });
                toast.success(`Successfully deleted ${count} session${count === 1 ? '' : 's'}`);
            },
        });
    };

    // Custom renderer for user agent field (shows device/browser with icon)
    const userAgentRenderer: FieldRenderer = useMemo(
        () => (value, _column, item) => {
            const device_info = parseUserAgent(value);
            const is_current = item.isCurrent || false;

            return (
                <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <Monitor className="w-4 h-4 text-base-content/50" />
                            <span className="text-sm font-medium">{device_info.browser}</span>
                        </div>
                        <span className="text-xs text-base-content/70">
                            {device_info.os} • {device_info.device}
                        </span>
                    </div>
                    {is_current && (
                        <span className="badge badge-success badge-sm flex-shrink-0">
                            Current Session
                        </span>
                    )}
                </div>
            );
        },
        []
    );

    // Custom renderer for last accessed (relative time)
    const dateLastAccessedRenderer: FieldRenderer = useMemo(
        () => (value) => {
            if (!value) return <span className="text-sm text-base-content/50">Never</span>;

            const date = new Date(value);
            return (
                <span className="text-sm" title={date.toLocaleString()}>
                    {formatDistanceToNow(date, { addSuffix: true })}
                </span>
            );
        },
        []
    );

    return (
        <HalCollectionList
            resource={data}
            onRefresh={refresh}
            onBulkDelete={handle_bulk_delete}
            primaryKey="sessionId"
            columnConfig={{
                userAgent: { label: 'Device & Browser' },
                ipAddress: { label: 'IP Address' },
                dateLastAccessed: { label: 'Last Accessed' },
            }}
            customRenderers={{
                userAgent: userAgentRenderer,
                dateLastAccessed: dateLastAccessedRenderer,
            }}
            emptyMessage="No active sessions found."
            emptyIcon={<Clock className="w-12 h-12" />}
            showCreateButton={false} // Sessions don't have a create operation
        />
    );
}
