import { useMemo, useState } from 'react';
import { ActionIcon, Badge, Button, Checkbox, Code, CopyButton, Group, Table, Text, Tooltip } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { formatDistanceToNow } from 'date-fns';
import { IconCheck, IconCopy, IconTrash, IconAlertCircle } from '@tabler/icons-react';
import { useExecuteTemplate } from '../../../hooks/use_hal_resource';
import { confirmDelete } from '../../../utils/confirm_delete';

export interface ApiKeyRowProps {
    apiKey: any; // HAL object with _templates
    onDelete?: () => void; // Callback after successful deletion
    showCheckbox?: boolean; // Show selection checkbox
    selected?: boolean; // Is this row selected
    onToggleSelect?: () => void; // Toggle selection callback
}

/**
 * Individual API key table row with HAL-FORMS template integration
 *
 * Displays API key information:
 * - Label for identification
 * - Key prefix with copy functionality
 * - Creation date (relative time)
 * - Expiration date with visual warnings
 * - Last used (relative time)
 * - Delete button (only shows if delete template exists)
 *
 * Expiration warnings:
 * - Red badge: Already expired
 * - Orange badge with icon: Expiring within 30 days
 * - Normal text: Not expiring soon or no expiration
 *
 * All delete operations use the HAL-FORMS delete template from the embedded resource.
 */
export function ApiKeyRow({ apiKey, onDelete, showCheckbox, selected, onToggleSelect }: ApiKeyRowProps) {
    const [deleting, setDeleting] = useState(false);
    const { execute } = useExecuteTemplate(() => {
        notifications.show({
            title: 'Success',
            message: 'API key deleted successfully',
            color: 'green',
        });
        onDelete?.();
    });

    // Memoize date formatting
    const createdText = useMemo(
        () =>
            apiKey.dateCreated
                ? formatDistanceToNow(new Date(apiKey.dateCreated), { addSuffix: true })
                : 'Unknown',
        [apiKey.dateCreated]
    );

    const lastUsedText = useMemo(
        () =>
            apiKey.dateLastUsed
                ? formatDistanceToNow(new Date(apiKey.dateLastUsed), { addSuffix: true })
                : 'Never',
        [apiKey.dateLastUsed]
    );

    // Calculate expiration status
    const expirationInfo = useMemo(() => {
        if (!apiKey.dateExpires) {
            return { text: 'Never', color: 'dimmed', warning: false };
        }

        const expiresDate = new Date(apiKey.dateExpires);
        const now = new Date();
        const daysUntilExpiry = Math.ceil((expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntilExpiry < 0) {
            return { text: 'Expired', color: 'red', warning: true };
        } else if (daysUntilExpiry <= 30) {
            return {
                text: `${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}`,
                color: 'orange',
                warning: true,
            };
        } else {
            return {
                text: formatDistanceToNow(expiresDate, { addSuffix: true }),
                color: 'dimmed',
                warning: false,
            };
        }
    }, [apiKey.dateExpires]);

    const handleDelete = async () => {
        const deleteTemplate = apiKey._templates?.delete;
        if (!deleteTemplate) return;

        confirmDelete({
            title: 'Delete API Key',
            message: `Are you sure you want to delete "${apiKey.label || apiKey.keyPrefix}"?`,
            onConfirm: async () => {
                setDeleting(true);
                try {
                    await execute(deleteTemplate, {});
                } catch (err) {
                    notifications.show({
                        title: 'Error',
                        message: 'Failed to delete API key',
                        color: 'red',
                    });
                } finally {
                    setDeleting(false);
                }
            }
        });
    };

    return (
        <Table.Tr>
            {/* Checkbox column only shows if bulk delete is available */}
            {showCheckbox && (
                <Table.Td>
                    <Checkbox
                        checked={selected}
                        onChange={onToggleSelect}
                        aria-label={`Select ${apiKey.label || apiKey.keyPrefix}`}
                    />
                </Table.Td>
            )}
            <Table.Td>
                <Text size="sm" fw={500}>
                    {apiKey.label || <Text c="dimmed">Unnamed</Text>}
                </Text>
            </Table.Td>
            <Table.Td>
                <Group gap="xs" wrap="nowrap">
                    <Code
                        style={{
                            flex: 1,
                            fontSize: '12px',
                            wordBreak: 'break-all',
                        }}
                    >
                        {apiKey.keyPrefix || apiKey.apiKey}
                    </Code>
                    <CopyButton value={apiKey.apiKey || apiKey.keyPrefix} timeout={2000}>
                        {({ copied, copy }) => (
                            <Tooltip label={copied ? 'Copied!' : 'Copy key prefix'} withArrow>
                                <ActionIcon
                                    color={copied ? 'teal' : 'gray'}
                                    variant="subtle"
                                    onClick={copy}
                                    size="sm"
                                >
                                    {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                                </ActionIcon>
                            </Tooltip>
                        )}
                    </CopyButton>
                </Group>
            </Table.Td>
            <Table.Td>
                <Text size="sm" c="dimmed">
                    {createdText}
                </Text>
            </Table.Td>
            <Table.Td>
                {expirationInfo.warning ? (
                    <Badge
                        color={expirationInfo.color}
                        variant="light"
                        leftSection={
                            expirationInfo.color === 'orange' ? <IconAlertCircle size={12} /> : undefined
                        }
                    >
                        {expirationInfo.text}
                    </Badge>
                ) : (
                    <Text size="sm" c={expirationInfo.color}>
                        {expirationInfo.text}
                    </Text>
                )}
            </Table.Td>
            <Table.Td>
                <Text size="sm" c="dimmed">
                    {lastUsedText}
                </Text>
            </Table.Td>
            <Table.Td>
                {/* Delete button only shows if template exists */}
                {apiKey._templates?.delete && (
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
