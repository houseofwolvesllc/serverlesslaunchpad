/**
 * Field Renderers - Default renderers for different field types
 *
 * These renderers provide sensible defaults for displaying different types of data
 * in HAL collections using DaisyUI classes. Custom renderers can override these on a per-field basis.
 *
 * Uses framework-agnostic utilities from web.commons.react for field value processing.
 */

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Copy, Check } from 'lucide-react';
import { FieldType, type InferredColumn, getEnumLabel } from '@houseofwolves/serverlesslaunchpad.web.commons';
import {
    determineBadgeVariant,
    formatDateValue,
    evaluateBooleanValue,
    shortenUrl,
    getNullValuePlaceholder,
    getEnumPropertyFromTemplates,
} from '@houseofwolves/serverlesslaunchpad.web.commons.react';
import { cn } from '@/lib/utils';

export type FieldRenderer = (value: any, column: InferredColumn, item: any) => React.ReactNode;

/**
 * Text field renderer - Simple text display with array support
 *
 * Automatically detects arrays and renders them as badges with enum label lookup.
 * This follows HATEOAS principles by using server-provided labels from HAL templates.
 */
export const TextRenderer: FieldRenderer = (value, column, item) => {
    if (value === null || value === undefined || value === '') {
        const placeholder = getNullValuePlaceholder(column.key, column.nullText || '—');
        return <span className="text-base-content/50 text-sm">{placeholder}</span>;
    }

    // Handle arrays (like features) - render as badges with enum lookup
    if (Array.isArray(value)) {
        if (value.length === 0) {
            return <span className="text-base-content/50 text-sm">{column.nullText || 'None'}</span>;
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
            <div className="flex flex-wrap gap-1">
                {labels.map((label, index) => (
                    <span key={index} className="badge badge-sm badge-ghost">
                        {label}
                    </span>
                ))}
            </div>
        );
    }

    return <span className="text-sm">{String(value)}</span>;
};

/**
 * Code field renderer component - Monospace text with copy button
 * Extracted as a component to properly use React hooks
 */
function CodeFieldComponent({ value, column }: { value: any; column: InferredColumn }) {
    const [copied, setCopied] = useState(false);

    if (!value) {
        const placeholder = getNullValuePlaceholder(column.key, column.nullText || '—');
        return <span className="text-base-content/50 text-sm">{placeholder}</span>;
    }

    const handleCopy = async (e: React.MouseEvent) => {
        e.stopPropagation();
        await navigator.clipboard.writeText(String(value));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex items-center gap-2 min-w-0">
            <code
                className="text-xs font-mono bg-base-200 px-2 py-1 rounded truncate min-w-0"
                title={String(value)}
            >
                {String(value)}
            </code>
            <button
                type="button"
                className="btn btn-ghost btn-xs btn-square"
                onClick={handleCopy}
                title="Copy to clipboard"
            >
                {copied ? (
                    <Check className="w-3.5 h-3.5 text-success" />
                ) : (
                    <Copy className="w-3.5 h-3.5" />
                )}
            </button>
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
        const placeholder = getNullValuePlaceholder(column.key, column.nullText || 'Never');
        return <span className="text-base-content/50 text-xs">{placeholder}</span>;
    }

    const { formatted, tooltip, isValid } = formatDateValue(value, column.key);

    if (!isValid) {
        return <span className="text-sm">{formatted}</span>;
    }

    // Replace placeholder with actual relative time if needed
    let displayValue = formatted;
    if (displayValue === '[RELATIVE]') {
        const date = new Date(value);
        displayValue = formatDistanceToNow(date, { addSuffix: true });
    }

    return (
        <span className="text-sm" title={tooltip}>
            {displayValue}
        </span>
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
        const placeholder = getNullValuePlaceholder(column.key, column.nullText || '—');
        return <span className="text-base-content/50 text-sm">{placeholder}</span>;
    }

    // Try to get enum property from HAL templates
    const enumProperty = getEnumPropertyFromTemplates(item, column.key);
    const displayValue = enumProperty
        ? getEnumLabel(value, enumProperty, String(value))
        : String(value);

    // Determine badge variant from display value and map to DaisyUI classes
    const variant = determineBadgeVariant(displayValue);
    const badgeClassMap: Record<string, string> = {
        'default': 'badge-success',
        'destructive': 'badge-error',
        'warning': 'badge-warning',
        'secondary': 'badge-ghost',
        'outline': 'badge-outline',
        'success': 'badge-success',
        'info': 'badge-info',
    };

    const badgeClass = badgeClassMap[variant] || 'badge-ghost';

    return (
        <span className={cn('badge badge-sm', badgeClass)}>
            {displayValue}
        </span>
    );
};

/**
 * Boolean field renderer - Yes/No badges
 */
export const BooleanRenderer: FieldRenderer = (value) => {
    const isTrue = evaluateBooleanValue(value);

    return (
        <span className={cn('badge badge-sm', isTrue ? 'badge-success' : 'badge-ghost')}>
            {isTrue ? 'Yes' : 'No'}
        </span>
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
        const placeholder = getNullValuePlaceholder(column.key, column.nullText || '—');
        return <span className="text-base-content/50 text-sm">{placeholder}</span>;
    }

    // Check if this is an enum field (numeric enums like Role)
    const enumProperty = getEnumPropertyFromTemplates(item, column.key);
    if (enumProperty) {
        const displayValue = getEnumLabel(value, enumProperty, String(value));
        return (
            <span className="badge badge-sm badge-ghost">
                {displayValue}
            </span>
        );
    }

    const num = Number(value);
    if (isNaN(num)) {
        return <span className="text-sm">{String(value)}</span>;
    }

    return <span className="text-sm font-mono tabular-nums">{num.toLocaleString()}</span>;
};

/**
 * Email field renderer - Mailto link with truncation
 */
export const EmailRenderer: FieldRenderer = (value, column) => {
    if (!value) {
        const placeholder = getNullValuePlaceholder(column.key, column.nullText || '—');
        return <span className="text-base-content/50 text-sm">{placeholder}</span>;
    }

    return (
        <a
            href={`mailto:${value}`}
            className="link link-primary text-sm block truncate"
            onClick={(e) => e.stopPropagation()}
            title={String(value)}
        >
            {String(value)}
        </a>
    );
};

/**
 * URL field renderer - External link
 */
export const UrlRenderer: FieldRenderer = (value, column) => {
    if (!value) {
        const placeholder = getNullValuePlaceholder(column.key, column.nullText || '—');
        return <span className="text-base-content/50 text-sm">{placeholder}</span>;
    }

    // Shorten long URLs for display
    const displayUrl = shortenUrl(String(value), 50);

    return (
        <a
            href={String(value)}
            target="_blank"
            rel="noopener noreferrer"
            className="link link-primary text-sm"
            onClick={(e) => e.stopPropagation()}
            title={String(value)}
        >
            {displayUrl}
        </a>
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
