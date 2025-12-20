/**
 * Field Renderers - Default renderers for different field types
 *
 * These renderers provide sensible defaults for displaying different types of data
 * in HAL collections. Custom renderers can override these on a per-field basis.
 */

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FieldType, type InferredColumn } from '@houseofwolves/serverlesslaunchpad.web.commons';

export type FieldRenderer = (value: any, column: InferredColumn, item: any) => React.ReactNode;

/**
 * Text field renderer - Simple text display
 */
export const TextRenderer: FieldRenderer = (value, column) => {
    if (value === null || value === undefined || value === '') {
        return <span className="text-muted-foreground text-sm">{column.nullText || '—'}</span>;
    }
    return <span className="text-sm">{String(value)}</span>;
};

/**
 * Code field renderer - Monospace text with copy button
 */
export const CodeRenderer: FieldRenderer = (value, column) => {
    const [copied, setCopied] = useState(false);

    if (!value) {
        return <span className="text-muted-foreground text-sm">{column.nullText || '—'}</span>;
    }

    const handleCopy = async (e: React.MouseEvent) => {
        e.stopPropagation();
        await navigator.clipboard.writeText(String(value));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex items-center gap-2">
            <code className="text-xs font-mono bg-muted px-2 py-1 rounded break-all max-w-md">
                {String(value)}
            </code>
            <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={handleCopy}
                title="Copy to clipboard"
            >
                {copied ? (
                    <Check className="h-3.5 w-3.5 text-green-600" />
                ) : (
                    <Copy className="h-3.5 w-3.5" />
                )}
            </Button>
        </div>
    );
};

/**
 * Date field renderer - Formatted dates with relative time support
 */
export const DateRenderer: FieldRenderer = (value, column) => {
    if (!value) {
        return <span className="text-muted-foreground text-xs">{column.nullText || 'Never'}</span>;
    }

    try {
        const date = new Date(value);

        // Check if date is valid
        if (isNaN(date.getTime())) {
            return <span className="text-sm">{String(value)}</span>;
        }

        // Relative time format (e.g., "2 hours ago")
        if (column.key.toLowerCase().includes('last')) {
            return (
                <span className="text-sm" title={date.toLocaleString()}>
                    {formatDistanceToNow(date, { addSuffix: true })}
                </span>
            );
        }

        // Short format (e.g., "Jan 1, 2024")
        return (
            <span className="text-sm" title={date.toLocaleString()}>
                {date.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                })}
            </span>
        );
    } catch (error) {
        return <span className="text-sm">{String(value)}</span>;
    }
};

/**
 * Badge field renderer - Status/type badges
 */
export const BadgeRenderer: FieldRenderer = (value, column) => {
    if (!value) {
        return <span className="text-muted-foreground text-sm">{column.nullText || '—'}</span>;
    }

    // Determine badge variant based on value
    const getVariant = (val: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
        const lower = String(val).toLowerCase();
        if (lower.includes('active') || lower.includes('success') || lower.includes('enabled')) {
            return 'default';
        }
        if (lower.includes('error') || lower.includes('failed') || lower.includes('disabled')) {
            return 'destructive';
        }
        if (lower.includes('pending') || lower.includes('warning')) {
            return 'outline';
        }
        return 'secondary';
    };

    return (
        <Badge variant={getVariant(String(value))} className="text-xs">
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
        <Badge variant={isTrue ? 'default' : 'secondary'} className="text-xs">
            {isTrue ? 'Yes' : 'No'}
        </Badge>
    );
};

/**
 * Number field renderer - Formatted numbers
 */
export const NumberRenderer: FieldRenderer = (value, column) => {
    if (value === null || value === undefined) {
        return <span className="text-muted-foreground text-sm">{column.nullText || '—'}</span>;
    }

    const num = Number(value);
    if (isNaN(num)) {
        return <span className="text-sm">{String(value)}</span>;
    }

    return <span className="text-sm tabular-nums">{num.toLocaleString()}</span>;
};

/**
 * Email field renderer - Mailto link
 */
export const EmailRenderer: FieldRenderer = (value, column) => {
    if (!value) {
        return <span className="text-muted-foreground text-sm">{column.nullText || '—'}</span>;
    }

    return (
        <a
            href={`mailto:${value}`}
            className="text-sm text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
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
        return <span className="text-muted-foreground text-sm">{column.nullText || '—'}</span>;
    }

    // Shorten long URLs for display
    const displayUrl = String(value).length > 50
        ? String(value).substring(0, 47) + '...'
        : String(value);

    return (
        <a
            href={String(value)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
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
