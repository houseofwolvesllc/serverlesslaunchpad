/**
 * Sessions List - Using Generic HalCollectionList
 *
 * This component has been migrated to use the generic HalCollectionList component,
 * drastically reducing code complexity.
 *
 * The generic component automatically handles:
 * - Column inference from data
 * - Selection and bulk operations
 * - Empty states
 * - Loading states
 * - Action toolbar
 *
 * Custom features:
 * - Custom renderers for device/browser info and current session badge
 * - Current session cannot be selected for deletion
 */

import { IconDeviceDesktop, IconClock, IconLock } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Text, Badge, Stack, Group } from '@mantine/core';
import { useSessions } from '../hooks/use_sessions';
import { HalCollectionList } from '../../../components/hal_collection';
import { useExecuteTemplate } from '../../../hooks/use_hal_resource';
import { confirmDelete } from '../../../utils/confirm_delete';
import { parseUserAgent } from '../utils/parse_user_agent';
import type { FieldRenderer } from '../../../components/hal_collection';

export function SessionsList() {
    const { data, sessions, refresh } = useSessions();

    // Create enriched resource with isCurrent property on sessions
    const enrichedResource = useMemo(() => {
        if (!data) return null;
        return {
            ...data,
            _embedded: {
                ...data._embedded,
                sessions: sessions,
            },
        };
    }, [data, sessions]);

    // Template execution for bulk delete
    const { execute: execute_bulk_delete } = useExecuteTemplate(() => {
        refresh();
    });

    // Handle bulk delete with confirmation
    const handle_bulk_delete = async (selected_ids: string[]) => {
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
                    notifications.show({
                        title: 'Success',
                        message: `${count} session(s) deleted successfully`,
                        color: 'green',
                    });
                } catch (err: any) {
                    notifications.show({
                        title: 'Error',
                        message: err.message || 'Failed to delete sessions',
                        color: 'red',
                    });
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
                <Group gap="xs" wrap="nowrap">
                    <IconDeviceDesktop size={16} style={{ color: 'var(--mantine-color-dimmed)' }} />
                    <Stack gap={4}>
                        <Text size="sm" fw={500}>{device_info.browser}</Text>
                        <Text size="xs" c="dimmed">
                            {device_info.os} • {device_info.device}
                        </Text>
                    </Stack>
                    {is_current && (
                        <>
                            <IconLock size={16} color="var(--mantine-color-blue-6)" />
                            <Badge color="blue" size="sm">
                                Current
                            </Badge>
                        </>
                    )}
                </Group>
            );
        },
        []
    );

    // Custom renderer for last accessed (relative time)
    const dateLastAccessedRenderer: FieldRenderer = useMemo(
        () => (value) => {
            if (!value) return <Text size="sm" c="dimmed">Never</Text>;

            const date = new Date(value);
            return (
                <Text size="sm" title={date.toLocaleString()}>
                    {formatDistanceToNow(date, { addSuffix: true })}
                </Text>
            );
        },
        []
    );

    return (
        <HalCollectionList
            resource={enrichedResource}
            onRefresh={refresh}
            onBulkDelete={handle_bulk_delete}
            primaryKey="sessionId"
            columnConfig={{
                sessionId: { hidden: true },
                userId: { hidden: true },
                isCurrent: { hidden: true },
                userAgent: { label: 'Device & Browser' },
                ipAddress: { label: 'IP Address' },
                dateLastAccessed: { label: 'Last Accessed' },
            }}
            customRenderers={{
                userAgent: userAgentRenderer,
                dateLastAccessed: dateLastAccessedRenderer,
            }}
            emptyMessage="No active sessions found."
            emptyIcon={<IconClock size={48} />}
            showCreateButton={false} // Sessions don't have a create operation
            selectableFilter={(item: any) => !item.isCurrent} // Prevent current session selection
        />
    );
}
