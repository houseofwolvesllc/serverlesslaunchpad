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
import {
    FieldType,
    type InferredColumn,
    getEnumLabel,
    determineBadgeVariant,
    formatDateValue,
    evaluateBooleanValue,
    shortenUrl,
    getNullValuePlaceholder,
    getEnumPropertyFromTemplates,
} from '@houseofwolves/serverlesslaunchpad.web.commons';

export type FieldRenderer = (value: any, column: InferredColumn, item: any) => React.ReactNode;

/**
 * Text field renderer - Simple text display with array support
 *
 * Automatically detects arrays and renders them as badges with enum label lookup.
 * This follows HATEOAS principles by using server-provided labels from HAL templates.
 */
export const TextRenderer: FieldRenderer = (value, column, item) => {
    if (value === null || value === undefined || value === '') {
        const nullPlaceholder = getNullValuePlaceholder(column.key, column.nullText || '—');
        return <Text size="sm" c="dimmed">{nullPlaceholder}</Text>;
    }

    // Handle arrays (like features) - render as badges with enum lookup
    if (Array.isArray(value)) {
        if (value.length === 0) {
            return <Text size="sm" c="dimmed">{column.nullText || 'None'}</Text>;
        }

        // Try to get enum property for label lookup
        const enumProperty = getEnumPropertyFromTemplates(item, column.key);
        const labels = value.map(val => {
            if (enumProperty) {
                return getEnumLabel(val, enumProperty, String(val));
            }
            return String(val);
        });

        return (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {labels.map((label, index) => (
                    <Badge key={index} color="gray" size="sm">
                        {label}
                    </Badge>
                ))}
            </div>
        );
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <Code
                style={{
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                }}
                title={String(value)}
            >
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
 * Badge field renderer - Status/type badges with enum support
 *
 * This renderer checks for enum metadata in HAL templates and uses
 * the display label when available, falling back to the raw value.
 * This follows HATEOAS principles by using server-provided labels.
 */
export const BadgeRenderer: FieldRenderer = (value, column, item) => {
    if (value === null || value === undefined || value === '') {
        return <Text size="sm" c="dimmed">{column.nullText || '—'}</Text>;
    }

    // Try to get enum property from HAL templates
    const enumProperty = getEnumPropertyFromTemplates(item, column.key);
    const displayValue = enumProperty
        ? getEnumLabel(value, enumProperty, String(value))
        : String(value);

    // Determine badge variant based on display value
    const variant = determineBadgeVariant(displayValue);

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
            {displayValue}
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
 * Number field renderer - Formatted numbers with enum support
 *
 * Checks for enum metadata first (for numeric enums like Role), then formats as number.
 * This follows HATEOAS principles by using server-provided labels from HAL templates.
 */
export const NumberRenderer: FieldRenderer = (value, column, item) => {
    if (value === null || value === undefined) {
        const nullPlaceholder = getNullValuePlaceholder(column.key, column.nullText || '—');
        return <Text size="sm" c="dimmed">{nullPlaceholder}</Text>;
    }

    // Check if this is an enum field (numeric enums like Role)
    const enumProperty = getEnumPropertyFromTemplates(item, column.key);
    if (enumProperty) {
        const displayValue = getEnumLabel(value, enumProperty, String(value));
        return (
            <Badge color="gray" size="sm">
                {displayValue}
            </Badge>
        );
    }

    const num = Number(value);
    if (isNaN(num)) {
        return <Text size="sm">{String(value)}</Text>;
    }

    return <Text size="sm" ff="monospace">{num.toLocaleString()}</Text>;
};

/**
 * Email field renderer - Mailto link with truncation
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
            title={String(value)}
            style={{
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
            }}
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
