import { Button, Group, List, Modal, Stack, Text } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { ApiKey } from '../types';

export interface DeleteApiKeysModalProps {
    opened: boolean;
    onClose: () => void;
    apiKeys: ApiKey[];
    onConfirm: () => void;
    loading: boolean;
}

/**
 * Confirmation modal for deleting API keys
 *
 * Displays:
 * - Count of API keys to be deleted
 * - List of API key names/prefixes
 * - Warning message
 * - Confirm/cancel actions
 */
export function DeleteApiKeysModal({ opened, onClose, apiKeys, onConfirm, loading }: DeleteApiKeysModalProps) {
    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title="Delete Selected API Keys?"
            centered
            closeOnClickOutside={!loading}
            closeOnEscape={!loading}
        >
            <Stack gap="md">
                <Group gap="xs">
                    <IconAlertTriangle size={20} color="var(--mantine-color-red-6)" />
                    <Text size="sm">
                        You are about to delete {apiKeys.length} API key{apiKeys.length !== 1 ? 's' : ''}.
                    </Text>
                </Group>

                <Text size="sm" c="dimmed">
                    This action cannot be undone. Applications using these keys will immediately lose access.
                </Text>

                {apiKeys.length > 0 && (
                    <List size="sm" spacing="xs">
                        {apiKeys.map((apiKey) => (
                            <List.Item key={apiKey.apiKeyId}>
                                <Text size="sm" fw={500}>
                                    {apiKey.label || 'Unnamed'}
                                </Text>
                                <Text size="xs" c="dimmed" style={{ wordBreak: 'break-all' }}>
                                    {apiKey.apiKey}
                                </Text>
                            </List.Item>
                        ))}
                    </List>
                )}

                <Group justify="flex-end" gap="sm" mt="md">
                    <Button variant="default" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button color="red" onClick={onConfirm} loading={loading}>
                        Delete {apiKeys.length} Key{apiKeys.length !== 1 ? 's' : ''}
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}
