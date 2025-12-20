import { useMemo, useState } from 'react';
import { Badge, Button, Checkbox, Group, Stack, Table, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconLock, IconTrash } from '@tabler/icons-react';
import { formatDistanceToNow } from 'date-fns';
import { useExecuteTemplate } from '../../../hooks/use_hal_resource';
import { Session } from '../types';
import { parseUserAgent } from '../utils/parse_user_agent';
import { confirmDelete } from '../../../utils/confirm_delete';

interface SessionRowProps {
    session: Session;
    onDelete?: () => void; // Callback after successful deletion
    showCheckbox?: boolean; // Show selection checkbox
    selected?: boolean; // Is this row selected
    onToggleSelect?: () => void; // Toggle selection callback
}

/**
 * Individual session table row with HAL-FORMS template integration
 *
 * Displays session information:
 * - Device details (browser and OS parsed from user agent)
 * - IP Address
 * - Last accessed (relative time)
 * - Created date
 * - Delete button (only shows if delete template exists and not current session)
 *
 * Current session:
 * - Highlighted with blue background
 * - Shows "Current" badge and lock icon
 * - Cannot be deleted (delete button hidden)
 *
 * All delete operations use the HAL-FORMS delete template from the embedded resource.
 */
export function SessionRow({ session, onDelete, showCheckbox, selected, onToggleSelect }: SessionRowProps) {
    const [deleting, setDeleting] = useState(false);
    const { execute } = useExecuteTemplate(() => {
        notifications.show({
            title: 'Success',
            message: 'Session deleted successfully',
            color: 'green',
        });
        onDelete?.();
    });

    // Memoize user agent parsing to avoid unnecessary re-computation
    const deviceInfo = useMemo(() => parseUserAgent(session.userAgent), [session.userAgent]);
    const isCurrent = session.isCurrent || false;

    // Memoize date formatting to avoid unnecessary re-computation
    const lastAccessed = useMemo(
        () =>
            session.dateLastAccessed
                ? formatDistanceToNow(new Date(session.dateLastAccessed), { addSuffix: true })
                : 'Never',
        [session.dateLastAccessed]
    );

    const created = useMemo(() => new Date(session.dateCreated).toLocaleDateString(), [session.dateCreated]);

    const handleDelete = async () => {
        const deleteTemplate = (session as any)._templates?.delete;
        if (!deleteTemplate) return;

        confirmDelete({
            title: 'Delete Session',
            message: `Are you sure you want to delete the session from ${deviceInfo.browser} on ${deviceInfo.os}?`,
            onConfirm: async () => {
                setDeleting(true);
                try {
                    await execute(deleteTemplate, {});
                } catch (err) {
                    notifications.show({
                        title: 'Error',
                        message: 'Failed to delete session',
                        color: 'red',
                    });
                } finally {
                    setDeleting(false);
                }
            }
        });
    };

    return (
        <Table.Tr
            style={{
                backgroundColor: isCurrent ? 'var(--mantine-color-blue-0)' : undefined,
            }}
        >
            {/* Checkbox column only shows if bulk delete is available */}
            {showCheckbox && (
                <Table.Td>
                    <Checkbox
                        checked={selected}
                        onChange={onToggleSelect}
                        disabled={isCurrent}
                        aria-label={`Select session from ${deviceInfo.browser}`}
                    />
                </Table.Td>
            )}
            <Table.Td>
                <Group gap="xs">
                    <Stack gap={0}>
                        <Text size="sm" fw={500}>
                            {deviceInfo.browser}
                        </Text>
                        <Text size="xs" c="dimmed">
                            {deviceInfo.os}
                        </Text>
                    </Stack>
                    {isCurrent && <IconLock size={16} color="var(--mantine-color-blue-6)" />}
                    {isCurrent && (
                        <Badge size="xs" color="blue" variant="light">
                            Current
                        </Badge>
                    )}
                </Group>
            </Table.Td>
            <Table.Td>
                <Text size="sm">{session.ipAddress}</Text>
            </Table.Td>
            <Table.Td>
                <Text size="sm">{lastAccessed}</Text>
            </Table.Td>
            <Table.Td>
                <Text size="sm">{created}</Text>
            </Table.Td>
            <Table.Td>
                {/* Delete button only shows if template exists and not current session */}
                {!isCurrent && (session as any)._templates?.delete && (
                    <Button
                        size="xs"
                        color="red"
                        variant="subtle"
                        leftSection={<IconTrash size={14} />}
                        onClick={handleDelete}
                        loading={deleting}
                    >
                        Delete
                    </Button>
                )}
            </Table.Td>
        </Table.Tr>
    );
}
