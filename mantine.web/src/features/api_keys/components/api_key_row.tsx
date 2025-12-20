import { useMemo } from 'react';
import { ActionIcon, Badge, Checkbox, Code, CopyButton, Group, Table, Text, Tooltip } from '@mantine/core';
import { formatDistanceToNow } from 'date-fns';
import { IconCheck, IconCopy, IconAlertCircle } from '@tabler/icons-react';

export interface ApiKeyRowProps {
    apiKey: any; // HAL object
    showCheckbox?: boolean; // Show selection checkbox
    selected?: boolean; // Is this row selected
    onToggleSelect?: () => void; // Toggle selection callback
}

/**
 * Individual API key table row
 *
 * Displays API key information:
 * - Label for identification
 * - Full API key with copy functionality
 * - Creation date (relative time)
 * - Expiration date with visual warnings
 * - Last used (relative time)
 * - Checkbox for bulk selection (when enabled)
 *
 * Expiration warnings:
 * - Red badge: Already expired
 * - Orange badge with icon: Expiring within 30 days
 * - Normal text: Not expiring soon or no expiration
 *
 * Delete operations are performed via bulk delete only.
 */
export function ApiKeyRow({ apiKey, showCheckbox, selected, onToggleSelect }: ApiKeyRowProps) {

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
                        {apiKey.apiKey || apiKey.keyPrefix}
                    </Code>
                    <CopyButton value={apiKey.apiKey || apiKey.keyPrefix} timeout={2000}>
                        {({ copied, copy }) => (
                            <Tooltip label={copied ? 'Copied!' : 'Copy full API key'} withArrow>
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
        </Table.Tr>
    );
}
