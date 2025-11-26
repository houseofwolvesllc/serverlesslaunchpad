/**
 * Field Renderers - Default renderers for different field types
 *
 * These renderers provide sensible defaults for displaying different types of data
 * in HAL collections using Mantine components. Custom renderers can override these on a per-field basis.
 *
 * Uses framework-agnostic utility functions from web.commons.react for:
 * - Badge variant determination
 * - Date formatting
 * - Boolean evaluation
 * - URL shortening
 * - Null value placeholders
 */

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { IconCopy, IconCheck } from '@tabler/icons-react';
import { ActionIcon, Badge, Code, Text, Anchor } from '@mantine/core';
import { FieldType, type InferredColumn } from '@houseofwolves/serverlesslaunchpad.web.commons';
import {
    determineBadgeVariant,
    formatDateValue,
    evaluateBooleanValue,
    shortenUrl,
    getNullValuePlaceholder,
} from '@houseofwolves/serverlesslaunchpad.web.commons.react';

export type FieldRenderer = (value: any, column: InferredColumn, item: any) => React.ReactNode;

/**
 * Text field renderer - Simple text display
 */
export const TextRenderer: FieldRenderer = (value, column) => {
    if (value === null || value === undefined || value === '') {
        const nullPlaceholder = getNullValuePlaceholder(column.key, column.nullText || '—');
        return <Text size="sm" c="dimmed">{nullPlaceholder}</Text>;
    }
    return <Text size="sm">{String(value)}</Text>;
};

/**
 * Code field renderer component - Monospace text with copy button
 * Extracted as a component to properly use React hooks
 */
function CodeFieldComponent({ value, column }: { value: any; column: InferredColumn }) {
    const [copied, setCopied] = useState(false);

    if (!value) {
        const nullPlaceholder = getNullValuePlaceholder(column.key, column.nullText || '—');
        return <Text size="sm" c="dimmed">{nullPlaceholder}</Text>;
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
}

/**
 * Code field renderer - Monospace text with copy button
 */
export const CodeRenderer: FieldRenderer = (value, column) => {
    return <CodeFieldComponent value={value} column={column} />;
};

/**
 * Date field renderer - Formatted dates with relative time support
 */
export const DateRenderer: FieldRenderer = (value, column) => {
    if (!value) {
        return <Text size="xs" c="dimmed">{column.nullText || 'Never'}</Text>;
    }

    const { formatted, tooltip, isValid } = formatDateValue(value, column.key);

    // Handle relative time placeholder - convert to actual relative time
    if (isValid && formatted === '[RELATIVE]') {
        const date = new Date(value);
        return (
            <Text size="sm" title={tooltip}>
                {formatDistanceToNow(date, { addSuffix: true })}
            </Text>
        );
    }

    if (!isValid) {
        return <Text size="sm">{String(value)}</Text>;
    }

    return (
        <Text size="sm" title={tooltip}>
            {formatted}
        </Text>
    );
};

/**
 * Badge field renderer - Status/type badges
 */
export const BadgeRenderer: FieldRenderer = (value, column) => {
    if (!value) {
        return <Text size="sm" c="dimmed">{column.nullText || '—'}</Text>;
    }

    // Determine badge variant based on value
    const variant = determineBadgeVariant(String(value));

    // Map variant to Mantine color
    const getColor = (variant: string): string => {
        switch (variant) {
            case 'default':
                return 'green';
            case 'destructive':
                return 'red';
            case 'warning':
                return 'yellow';
            case 'secondary':
            default:
                return 'gray';
        }
    };

    return (
        <Badge color={getColor(variant)} size="sm">
            {String(value)}
        </Badge>
    );
};

/**
 * Boolean field renderer - Yes/No badges
 */
export const BooleanRenderer: FieldRenderer = (value) => {
    const isTrue = evaluateBooleanValue(value);

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
        const nullPlaceholder = getNullValuePlaceholder(column.key, column.nullText || '—');
        return <Text size="sm" c="dimmed">{nullPlaceholder}</Text>;
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
        const nullPlaceholder = getNullValuePlaceholder(column.key, column.nullText || '—');
        return <Text size="sm" c="dimmed">{nullPlaceholder}</Text>;
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
        const nullPlaceholder = getNullValuePlaceholder(column.key, column.nullText || '—');
        return <Text size="sm" c="dimmed">{nullPlaceholder}</Text>;
    }

    // Shorten long URLs for display
    const displayUrl = shortenUrl(String(value));

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
