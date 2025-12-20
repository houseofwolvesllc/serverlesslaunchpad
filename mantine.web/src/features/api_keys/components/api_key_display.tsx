import { ActionIcon, Alert, Box, Button, Code, CopyButton, Group, Stack, Text, Tooltip } from '@mantine/core';
import { IconAlertCircle, IconCheck, IconCopy } from '@tabler/icons-react';

/**
 * Props for ApiKeyDisplay component
 */
interface ApiKeyDisplayProps {
    /** Full API key to display (shown only once) */
    apiKey: string;
    /** Label for the API key */
    label?: string;
    /** Created date */
    dateCreated?: string;
    /** Callback when user closes the display */
    onClose: () => void;
}

/**
 * API Key Display Component
 *
 * Displays a newly created API key with copy functionality.
 * The full API key is also accessible from the list view at any time.
 *
 * Features:
 * - Success message about key creation
 * - Copy to clipboard with visual feedback
 * - Display of key metadata (label, created date)
 * - Manual close action
 *
 * @example
 * ```tsx
 * <ApiKeyDisplay
 *   apiKey="7vAHfS9Lm3kQwT4uB8pN6xZc2gY1jR5oMtWqDfKp8h"
 *   label="Production API Key"
 *   dateCreated="2025-10-27T00:00:00Z"
 *   onClose={handleClose}
 * />
 * ```
 */
export function ApiKeyDisplay({
    apiKey,
    label,
    dateCreated,
    onClose,
}: ApiKeyDisplayProps) {
    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Unknown';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    return (
        <Stack gap="md">
            {/* Security Warning */}
            <Alert icon={<IconAlertCircle size={20} />} color="blue" title="API Key Created Successfully">
                Your API key has been created. You can copy it now or access it anytime from the API keys list.
                Keep your API keys secure and never share them publicly.
            </Alert>

            {/* API Key Display with Copy */}
            <Box>
                <Text size="sm" fw={500} mb="xs">
                    API Key
                </Text>
                <Group gap="xs" wrap="nowrap">
                    <Code
                        style={{
                            flex: 1,
                            padding: '12px',
                            fontSize: '14px',
                            wordBreak: 'break-all',
                            backgroundColor: 'var(--mantine-color-gray-1)',
                        }}
                    >
                        {apiKey}
                    </Code>
                    <CopyButton value={apiKey} timeout={2000}>
                        {({ copied, copy }) => (
                            <Tooltip label={copied ? 'Copied!' : 'Copy to clipboard'} withArrow>
                                <ActionIcon
                                    color={copied ? 'teal' : 'gray'}
                                    variant="subtle"
                                    onClick={copy}
                                    size="lg"
                                >
                                    {copied ? <IconCheck size={18} /> : <IconCopy size={18} />}
                                </ActionIcon>
                            </Tooltip>
                        )}
                    </CopyButton>
                </Group>
            </Box>

            {/* Metadata */}
            <Stack gap="xs">
                {label && (
                    <Group justify="space-between">
                        <Text size="sm" c="dimmed">
                            Label:
                        </Text>
                        <Text size="sm">{label}</Text>
                    </Group>
                )}
                {dateCreated && (
                    <Group justify="space-between">
                        <Text size="sm" c="dimmed">
                            Created:
                        </Text>
                        <Text size="sm">{formatDate(dateCreated)}</Text>
                    </Group>
                )}
            </Stack>

            {/* Close Button */}
            <Group justify="flex-end" mt="md">
                <Button onClick={onClose}>
                    Close
                </Button>
            </Group>
        </Stack>
    );
}
