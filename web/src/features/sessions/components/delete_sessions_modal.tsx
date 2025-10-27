import { Button, Group, List, Modal, Stack, Text } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { Session } from '../types';
import { parseUserAgent } from '../utils/parse_user_agent';

interface DeleteSessionsModalProps {
    opened: boolean;
    onClose: () => void;
    sessions: Session[];
    onConfirm: () => void;
    loading?: boolean;
}

export function DeleteSessionsModal({
    opened,
    onClose,
    sessions,
    onConfirm,
    loading = false,
}: DeleteSessionsModalProps) {
    return (
        <Modal opened={opened} onClose={onClose} title="Delete Selected Sessions?" size="md">
            <Stack gap="md">
                <Group gap="xs">
                    <IconAlertTriangle size={20} color="var(--mantine-color-orange-6)" />
                    <Text size="sm">
                        You are about to delete {sessions.length} session{sessions.length > 1 ? 's' : ''}.
                    </Text>
                </Group>

                <Text size="sm" c="dimmed">
                    These devices will be signed out and will need to sign in again.
                </Text>

                <Stack gap="xs">
                    <Text size="sm" fw={500}>
                        Sessions to delete:
                    </Text>
                    <List size="sm">
                        {sessions.map((session) => {
                            const deviceInfo = parseUserAgent(session.userAgent);
                            return (
                                <List.Item key={session.sessionToken}>
                                    {deviceInfo.browser} on {deviceInfo.os} ({session.ipAddress})
                                </List.Item>
                            );
                        })}
                    </List>
                </Stack>

                <Group justify="flex-end" gap="sm">
                    <Button variant="subtle" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button color="red" onClick={onConfirm} loading={loading}>
                        Delete Sessions
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}
