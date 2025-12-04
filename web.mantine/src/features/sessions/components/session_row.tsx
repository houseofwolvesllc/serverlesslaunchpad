import { useMemo } from 'react';
import { Badge, Checkbox, Group, Stack, Table, Text } from '@mantine/core';
import { IconDeviceDesktop, IconLock } from '@tabler/icons-react';
import { formatDistanceToNow } from 'date-fns';
import { Session } from '../types';
import { parseUserAgent } from '../utils/parse_user_agent';

interface SessionRowProps {
    session: Session;
    showCheckbox?: boolean; // Show selection checkbox
    selected?: boolean; // Is this row selected
    onToggleSelect?: () => void; // Toggle selection callback
}

/**
 * Individual session table row
 *
 * Displays session information:
 * - Device details (browser and OS parsed from user agent)
 * - IP Address
 * - Last accessed (relative time)
 * - Created date
 * - Checkbox for bulk selection (when enabled)
 *
 * Current session:
 * - Highlighted with blue background
 * - Shows "Current" badge and lock icon
 * - Cannot be selected for deletion (checkbox disabled)
 *
 * Delete operations are performed via bulk delete only.
 */
export function SessionRow({ session, showCheckbox, selected, onToggleSelect }: SessionRowProps) {

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
                <Group gap="xs" wrap="nowrap">
                    <IconDeviceDesktop size={16} color="var(--mantine-color-dimmed)" />
                    <Stack gap={0}>
                        <Text size="sm" fw={500}>
                            {deviceInfo.browser}
                        </Text>
                        <Text size="xs" c="dimmed">
                            {deviceInfo.os} • {deviceInfo.device}
                        </Text>
                    </Stack>
                    {isCurrent && (
                        <>
                            <IconLock size={16} color="var(--mantine-color-blue-6)" />
                            <Badge size="xs" color="blue" variant="light">
                                Current
                            </Badge>
                        </>
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
        </Table.Tr>
    );
}
