import { useMemo } from 'react';
import { Badge, Checkbox, Group, Stack, Table, Text } from '@mantine/core';
import { IconLock } from '@tabler/icons-react';
import { formatDistanceToNow } from 'date-fns';
import { Session } from '../types';
import { parseUserAgent } from '../utils/parse_user_agent';

interface SessionRowProps {
    session: Session;
    isSelected: boolean;
    onSelectionChange: (sessionId: string, selected: boolean) => void;
}

/**
 * Individual session table row
 *
 * Displays session information with device details parsed from user agent.
 * Current session is highlighted and cannot be deleted.
 */
export function SessionRow({ session, isSelected, onSelectionChange }: SessionRowProps) {
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
            <Table.Td>
                <Checkbox
                    checked={isSelected}
                    onChange={(e) => onSelectionChange(session.sessionId, e.currentTarget.checked)}
                    disabled={isCurrent}
                    aria-label={isCurrent ? 'Current session (cannot be deleted)' : 'Select session'}
                />
            </Table.Td>
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
        </Table.Tr>
    );
}
