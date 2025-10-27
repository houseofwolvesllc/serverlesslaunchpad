import { useMemo } from 'react';
import { ActionIcon, Checkbox, Code, CopyButton, Group, Table, Text, Tooltip } from '@mantine/core';
import { formatDistanceToNow } from 'date-fns';
import { IconCheck, IconCopy } from '@tabler/icons-react';
import { ApiKey } from '../types';

export interface ApiKeyRowProps {
    apiKey: ApiKey;
    selected: boolean;
    onSelectionChange: (apiKeyId: string, selected: boolean) => void;
}

/**
 * Individual API key table row
 *
 * Displays API key information:
 * - Label for identification
 * - Key prefix for visual reference
 * - Relative time for last used ("2 hours ago", "Never")
 */
export function ApiKeyRow({ apiKey, selected, onSelectionChange }: ApiKeyRowProps) {
    // Memoize last used formatting
    const lastUsedText = useMemo(
        () =>
            apiKey.dateLastUsed
                ? formatDistanceToNow(new Date(apiKey.dateLastUsed), { addSuffix: true })
                : 'Never',
        [apiKey.dateLastUsed]
    );

    return (
        <Table.Tr>
            <Table.Td>
                <Checkbox
                    checked={selected}
                    onChange={(event) => onSelectionChange(apiKey.apiKeyId, event.currentTarget.checked)}
                    aria-label={`Select API key ${apiKey.label || apiKey.keyPrefix}`}
                />
            </Table.Td>
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
                        {apiKey.apiKey}
                    </Code>
                    <CopyButton value={apiKey.apiKey} timeout={2000}>
                        {({ copied, copy }) => (
                            <Tooltip label={copied ? 'Copied!' : 'Copy API key'} withArrow>
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
                    {lastUsedText}
                </Text>
            </Table.Td>
        </Table.Tr>
    );
}
