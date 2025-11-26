/**
 * Field Rendering Utilities
 *
 * Pure utility functions extracted from React field renderers across
 * web.shadcn, web.mantine, and web.daisyui packages.
 *
 * These utilities provide framework-agnostic logic for:
 * - Badge variant determination based on field values
 * - Date formatting with relative and absolute time support
 * - Boolean value evaluation from various input types
 * - URL shortening for display
 * - Null value placeholder generation
 * - Enum property extraction from HAL templates
 *
 * All functions are pure (no side effects) and framework-independent.
 *
 * @module field-rendering
 */

import { type HalTemplateProperty } from '@houseofwolves/serverlesslaunchpad.web.commons';

/**
 * Badge variant types for different UI frameworks
 */
export type BadgeVariant =
    | 'default'
    | 'secondary'
    | 'destructive'
    | 'outline'
    | 'success'
    | 'warning'
    | 'info';

/**
 * Extracts enum metadata from HAL templates for a specific field.
 *
 * Searches through all templates in a HAL resource item to find a property
 * matching the given field name that has enum options defined.
 *
 * @param item - HAL resource item containing _templates
 * @param fieldName - Name of the field to find enum metadata for
 * @param templates - Optional pre-extracted templates object (for performance)
 * @returns The template property with enum options, or undefined if not found
 *
 * @example
 * ```typescript
 * const item = {
 *   role: 1,
 *   _templates: {
 *     update: {
 *       properties: [
 *         {
 *           name: 'role',
 *           options: {
 *             inline: [
 *               { value: '0', label: 'User' },
 *               { value: '1', label: 'Admin' }
 *             ]
 *           }
 *         }
 *       ]
 *     }
 *   }
 * };
 *
 * const enumProp = getEnumPropertyFromTemplates(item, 'role');
 * // Returns the property with options for 'role'
 * ```
 */
export function getEnumPropertyFromTemplates(
    item: any,
    fieldName: string,
    templates?: any
): HalTemplateProperty | undefined {
    const templatesObj = templates ?? item?._templates;
    if (!templatesObj) return undefined;

    // Check all templates for a property matching this field
    for (const template of Object.values(templatesObj)) {
        if (typeof template === 'object' && template !== null && 'properties' in template) {
            const properties = (template as any).properties;
            if (Array.isArray(properties)) {
                const property = properties.find((p: any) => p.name === fieldName);
                if (property?.options) {
                    return property as HalTemplateProperty;
                }
            }
        }
    }

    return undefined;
}

/**
 * Determines the appropriate badge variant based on a string value.
 *
 * Analyzes the value for common status keywords and returns a semantic
 * variant type. The mapping is:
 * - 'default': active, success, enabled
 * - 'destructive': error, failed, disabled
 * - 'warning': pending, warning
 * - 'secondary': everything else
 *
 * @param value - The string value to analyze (case-insensitive)
 * @returns A badge variant type
 *
 * @example
 * ```typescript
 * determineBadgeVariant('Active') // 'default'
 * determineBadgeVariant('ERROR') // 'destructive'
 * determineBadgeVariant('Pending Review') // 'warning'
 * determineBadgeVariant('Draft') // 'secondary'
 * ```
 */
export function determineBadgeVariant(value: string): BadgeVariant {
    const lower = value.toLowerCase();

    if (lower.includes('active') || lower.includes('success') || lower.includes('enabled')) {
        return 'default';
    }

    if (lower.includes('error') || lower.includes('failed') || lower.includes('disabled')) {
        return 'destructive';
    }

    if (lower.includes('pending') || lower.includes('warning')) {
        return 'warning';
    }

    return 'secondary';
}

/**
 * Formats a date value with relative or absolute time based on the field key.
 *
 * - Fields containing 'last' (e.g., 'last_login') use relative time ("2 hours ago")
 * - Other fields use short absolute format ("Jan 1, 2024")
 *
 * @param value - The date value (Date object, string, or number timestamp)
 * @param fieldKey - The field name to determine format preference
 * @returns Object containing formatted date, tooltip, and validity flag
 *
 * @example
 * ```typescript
 * const lastLogin = formatDateValue(new Date('2024-01-15'), 'last_login');
 * // { formatted: '2 hours ago', tooltip: 'Mon, 15 Jan 2024 12:00:00', isValid: true }
 *
 * const createdAt = formatDateValue('2024-01-15', 'created_at');
 * // { formatted: 'Jan 15, 2024', tooltip: 'Mon, 15 Jan 2024 00:00:00', isValid: true }
 *
 * const invalid = formatDateValue('invalid', 'date');
 * // { formatted: 'invalid', tooltip: undefined, isValid: false }
 * ```
 */
export function formatDateValue(
    value: Date | string | number,
    fieldKey: string
): {
    formatted: string;
    tooltip: string | undefined;
    isValid: boolean;
} {
    try {
        const date = new Date(value);

        // Check if date is valid
        if (isNaN(date.getTime())) {
            return {
                formatted: String(value),
                tooltip: undefined,
                isValid: false,
            };
        }

        const tooltip = date.toLocaleString();

        // Relative time format for 'last_*' fields (requires date-fns in consumer)
        if (fieldKey.toLowerCase().includes('last')) {
            // Note: Consumer must import and use formatDistanceToNow from date-fns
            return {
                formatted: '[RELATIVE]', // Placeholder - consumer replaces with formatDistanceToNow
                tooltip,
                isValid: true,
            };
        }

        // Short format for other date fields
        const formatted = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });

        return {
            formatted,
            tooltip,
            isValid: true,
        };
    } catch (error) {
        return {
            formatted: String(value),
            tooltip: undefined,
            isValid: false,
        };
    }
}

/**
 * Evaluates if a value should be considered boolean true.
 *
 * Handles multiple value types commonly used for boolean representation:
 * - boolean true
 * - string 'true' (case-insensitive)
 * - number 1
 *
 * @param value - The value to evaluate
 * @returns true if value represents a truthy boolean, false otherwise
 *
 * @example
 * ```typescript
 * evaluateBooleanValue(true) // true
 * evaluateBooleanValue('true') // true
 * evaluateBooleanValue('TRUE') // true
 * evaluateBooleanValue(1) // true
 * evaluateBooleanValue(false) // false
 * evaluateBooleanValue('false') // false
 * evaluateBooleanValue(0) // false
 * evaluateBooleanValue('yes') // false (only 'true' string is accepted)
 * ```
 */
export function evaluateBooleanValue(value: any): boolean {
    if (typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'string') {
        return value.toLowerCase() === 'true';
    }

    if (typeof value === 'number') {
        return value === 1;
    }

    return false;
}

/**
 * Shortens a URL for display purposes while maintaining readability.
 *
 * URLs longer than maxLength are truncated with ellipsis.
 *
 * @param url - The URL string to shorten
 * @param maxLength - Maximum length before truncation (default: 50)
 * @returns Shortened URL string
 *
 * @example
 * ```typescript
 * const short = shortenUrl('https://example.com');
 * // 'https://example.com'
 *
 * const long = shortenUrl('https://example.com/very/long/path/to/resource?param=value');
 * // 'https://example.com/very/long/path/to/resourc...'
 *
 * const custom = shortenUrl('https://example.com/long/url', 30);
 * // 'https://example.com/long/...'
 * ```
 */
export function shortenUrl(url: string, maxLength: number = 50): string {
    if (url.length <= maxLength) {
        return url;
    }

    return url.substring(0, maxLength - 3) + '...';
}

/**
 * Returns an appropriate placeholder for null/undefined values based on column name.
 *
 * Provides semantic placeholders for common field types:
 * - Date/time fields: 'Never'
 * - Count/numeric fields: '0' or '—'
 * - Other fields: '—'
 *
 * @param columnName - The field/column name to determine placeholder for
 * @param defaultPlaceholder - Default placeholder if no specific match (default: '—')
 * @returns Appropriate placeholder string
 *
 * @example
 * ```typescript
 * getNullValuePlaceholder('last_login') // 'Never'
 * getNullValuePlaceholder('created_at') // 'Never'
 * getNullValuePlaceholder('count') // '0'
 * getNullValuePlaceholder('email') // '—'
 * getNullValuePlaceholder('name', 'N/A') // 'N/A'
 * ```
 */
export function getNullValuePlaceholder(
    columnName: string,
    defaultPlaceholder: string = '—'
): string {
    const lowerName = columnName.toLowerCase();

    // Date/time fields
    if (
        lowerName.includes('date') ||
        lowerName.includes('time') ||
        lowerName.includes('last_') ||
        lowerName.includes('_at')
    ) {
        return 'Never';
    }

    // Count/numeric fields
    if (lowerName.includes('count') || lowerName === 'total') {
        return '0';
    }

    return defaultPlaceholder;
}

/**
 * Type guard to check if a value is an array.
 *
 * @param value - Value to check
 * @returns true if value is an array
 *
 * @example
 * ```typescript
 * isArrayValue(['a', 'b']) // true
 * isArrayValue('string') // false
 * isArrayValue(null) // false
 * ```
 */
export function isArrayValue(value: any): value is any[] {
    return Array.isArray(value);
}

/**
 * Type guard to check if a value is null or undefined.
 *
 * @param value - Value to check
 * @returns true if value is null or undefined
 *
 * @example
 * ```typescript
 * isNullish(null) // true
 * isNullish(undefined) // true
 * isNullish('') // false
 * isNullish(0) // false
 * ```
 */
export function isNullish(value: any): value is null | undefined {
    return value === null || value === undefined;
}

/**
 * Type guard to check if a value is empty (null, undefined, or empty string).
 *
 * @param value - Value to check
 * @returns true if value is null, undefined, or empty string
 *
 * @example
 * ```typescript
 * isEmpty(null) // true
 * isEmpty(undefined) // true
 * isEmpty('') // true
 * isEmpty(' ') // false (whitespace is not empty)
 * isEmpty(0) // false
 * isEmpty([]) // false (empty array is not empty by this definition)
 * ```
 */
export function isEmpty(value: any): value is null | undefined | '' {
    return value === null || value === undefined || value === '';
}

/**
 * Validates if a date object represents a valid date.
 *
 * @param date - Date object to validate
 * @returns true if the date is valid
 *
 * @example
 * ```typescript
 * isValidDate(new Date('2024-01-15')) // true
 * isValidDate(new Date('invalid')) // false
 * isValidDate(new Date(NaN)) // false
 * ```
 */
export function isValidDate(date: Date): boolean {
    return date instanceof Date && !isNaN(date.getTime());
}
