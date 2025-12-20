/**
 * Field Renderers - Default renderers for different field types
 *
 * These renderers provide sensible defaults for displaying different types of data
 * in HAL collections using Mantine components. Custom renderers can override these on a per-field basis.
 */

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { IconCopy, IconCheck } from '@tabler/icons-react';
import { ActionIcon, Badge, Code, Text, Anchor } from '@mantine/core';
import { FieldType, type InferredColumn } from '@houseofwolves/serverlesslaunchpad.web.commons';

export type FieldRenderer = (value: any, column: InferredColumn, item: any) => React.ReactNode;

/**
 * Text field renderer - Simple text display
 */
export const TextRenderer: FieldRenderer = (value, column) => {
    if (value === null || value === undefined || value === '') {
        return <Text size="sm" c="dimmed">{column.nullText || '—'}</Text>;
    }
    return <Text size="sm">{String(value)}</Text>;
};

/**
 * Code field renderer - Monospace text with copy button
 */
export const CodeRenderer: FieldRenderer = (value, column) => {
    const [copied, setCopied] = useState(false);

    if (!value) {
        return <Text size="sm" c="dimmed">{column.nullText || '—'}</Text>;
    }

    const handleCopy = async (e: React.MouseEvent) => {
        e.stopPropagation();
        await navigator.clipboard.writeText(String(value));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Code style={{ maxWidth: '400px', wordBreak: 'break-all' }}>
                {String(value)}
            </Code>
            <ActionIcon
                variant="subtle"
                size="sm"
                onClick={handleCopy}
                title="Copy to clipboard"
            >
                {copied ? (
                    <IconCheck size={14} color="var(--mantine-color-green-6)" />
                ) : (
                    <IconCopy size={14} />
                )}
            </ActionIcon>
        </div>
    );
};

/**
 * Date field renderer - Formatted dates with relative time support
 */
export const DateRenderer: FieldRenderer = (value, column) => {
    if (!value) {
        return <Text size="xs" c="dimmed">{column.nullText || 'Never'}</Text>;
    }

    try {
        const date = new Date(value);

        // Check if date is valid
        if (isNaN(date.getTime())) {
            return <Text size="sm">{String(value)}</Text>;
        }

        // Relative time format (e.g., "2 hours ago")
        if (column.key.toLowerCase().includes('last')) {
            return (
                <Text size="sm" title={date.toLocaleString()}>
                    {formatDistanceToNow(date, { addSuffix: true })}
                </Text>
            );
        }

        // Short format (e.g., "Jan 1, 2024")
        return (
            <Text size="sm" title={date.toLocaleString()}>
                {date.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                })}
            </Text>
        );
    } catch (error) {
        return <Text size="sm">{String(value)}</Text>;
    }
};

/**
 * Badge field renderer - Status/type badges
 */
export const BadgeRenderer: FieldRenderer = (value, column) => {
    if (!value) {
        return <Text size="sm" c="dimmed">{column.nullText || '—'}</Text>;
    }

    // Determine badge color based on value
    const getColor = (val: string): string => {
        const lower = String(val).toLowerCase();
        if (lower.includes('active') || lower.includes('success') || lower.includes('enabled')) {
            return 'green';
        }
        if (lower.includes('error') || lower.includes('failed') || lower.includes('disabled')) {
            return 'red';
        }
        if (lower.includes('pending') || lower.includes('warning')) {
            return 'yellow';
        }
        return 'gray';
    };

    return (
        <Badge color={getColor(String(value))} size="sm">
            {String(value)}
        </Badge>
    );
};

/**
 * Boolean field renderer - Yes/No badges
 */
export const BooleanRenderer: FieldRenderer = (value) => {
    const isTrue = value === true || value === 'true' || value === 1;

    return (
        <Badge color={isTrue ? 'green' : 'gray'} size="sm">
            {isTrue ? 'Yes' : 'No'}
        </Badge>
    );
};

/**
 * Number field renderer - Formatted numbers
 */
export const NumberRenderer: FieldRenderer = (value, column) => {
    if (value === null || value === undefined) {
        return <Text size="sm" c="dimmed">{column.nullText || '—'}</Text>;
    }

    const num = Number(value);
    if (isNaN(num)) {
        return <Text size="sm">{String(value)}</Text>;
    }

    return <Text size="sm" ff="monospace">{num.toLocaleString()}</Text>;
};

/**
 * Email field renderer - Mailto link
 */
export const EmailRenderer: FieldRenderer = (value, column) => {
    if (!value) {
        return <Text size="sm" c="dimmed">{column.nullText || '—'}</Text>;
    }

    return (
        <Anchor
            href={`mailto:${value}`}
            size="sm"
            onClick={(e) => e.stopPropagation()}
        >
            {String(value)}
        </Anchor>
    );
};

/**
 * URL field renderer - External link
 */
export const UrlRenderer: FieldRenderer = (value, column) => {
    if (!value) {
        return <Text size="sm" c="dimmed">{column.nullText || '—'}</Text>;
    }

    // Shorten long URLs for display
    const displayUrl = String(value).length > 50
        ? String(value).substring(0, 47) + '...'
        : String(value);

    return (
        <Anchor
            href={String(value)}
            target="_blank"
            rel="noopener noreferrer"
            size="sm"
            onClick={(e) => e.stopPropagation()}
            title={String(value)}
        >
            {displayUrl}
        </Anchor>
    );
};

/**
 * Hidden field renderer - Returns null (should not be displayed)
 */
export const HiddenRenderer: FieldRenderer = () => null;

/**
 * Default field renderers mapped by FieldType
 */
export const DEFAULT_FIELD_RENDERERS: Record<FieldType, FieldRenderer> = {
    [FieldType.TEXT]: TextRenderer,
    [FieldType.CODE]: CodeRenderer,
    [FieldType.DATE]: DateRenderer,
    [FieldType.BADGE]: BadgeRenderer,
    [FieldType.BOOLEAN]: BooleanRenderer,
    [FieldType.NUMBER]: NumberRenderer,
    [FieldType.EMAIL]: EmailRenderer,
    [FieldType.URL]: UrlRenderer,
    [FieldType.HIDDEN]: HiddenRenderer,
};

/**
 * Get the appropriate renderer for a column
 */
export function getFieldRenderer(
    column: InferredColumn,
    customRenderers?: Record<string, FieldRenderer>
): FieldRenderer {
    // Check for custom renderer first
    if (customRenderers && customRenderers[column.key]) {
        return customRenderers[column.key];
    }

    // Use default renderer for field type
    return DEFAULT_FIELD_RENDERERS[column.type] || TextRenderer;
}
