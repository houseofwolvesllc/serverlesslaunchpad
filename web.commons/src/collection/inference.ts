/**
 * Collection Inference Engine
 *
 * Automatically infers column definitions and field types from collection data.
 * Uses naming conventions and value inspection to determine rendering strategies.
 */

import type { HalObject } from '@houseofwolves/serverlesslaunchpad.types/hal';
import { FieldType, type InferredColumn, type InferenceOptions } from './types';
import { mergeConventions } from './conventions';
import {
    getUniqueKeys,
    humanizeLabel,
    matchesPattern,
    isDateValue,
    isUrlValue,
    isEmailValue,
} from './utils';

/**
 * Infer field type from field name and sample values
 *
 * @param fieldName - Name of the field
 * @param sampleValues - Array of sample values from the field
 * @param options - Inference options
 * @returns Inferred field type
 */
export function inferFieldType(
    fieldName: string,
    sampleValues: any[],
    options: InferenceOptions = {}
): FieldType {
    const conventions = mergeConventions(options.conventions);

    // Check for overrides first
    if (options.fieldTypeOverrides?.[fieldName]) {
        return options.fieldTypeOverrides[fieldName];
    }

    // Check if field should be hidden
    if (matchesPattern(fieldName, conventions.hiddenPatterns)) {
        return FieldType.HIDDEN;
    }

    // Check naming conventions
    if (matchesPattern(fieldName, conventions.booleanPatterns)) {
        return FieldType.BOOLEAN;
    }

    if (matchesPattern(fieldName, conventions.datePatterns)) {
        return FieldType.DATE;
    }

    if (matchesPattern(fieldName, conventions.badgePatterns)) {
        return FieldType.BADGE;
    }

    if (matchesPattern(fieldName, conventions.urlPatterns)) {
        return FieldType.URL;
    }

    if (matchesPattern(fieldName, conventions.emailPatterns)) {
        return FieldType.EMAIL;
    }

    if (matchesPattern(fieldName, conventions.codePatterns)) {
        return FieldType.CODE;
    }

    // Inspect sample values
    const nonNullValues = sampleValues.filter(v => v !== null && v !== undefined);

    if (nonNullValues.length === 0) {
        return FieldType.TEXT; // Default for empty fields
    }

    // Check first few non-null values
    const firstValue = nonNullValues[0];

    // Boolean check
    if (typeof firstValue === 'boolean') {
        return FieldType.BOOLEAN;
    }

    // Number check
    if (typeof firstValue === 'number') {
        return FieldType.NUMBER;
    }

    // String value inspection
    if (typeof firstValue === 'string') {
        // Check if it's a date
        if (isDateValue(firstValue)) {
            return FieldType.DATE;
        }

        // Check if it's a URL
        if (isUrlValue(firstValue)) {
            return FieldType.URL;
        }

        // Check if it's an email
        if (isEmailValue(firstValue)) {
            return FieldType.EMAIL;
        }

        // Check if it looks like code (UUID, hash, etc.)
        const codePattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i; // UUID
        const hashPattern = /^[a-f0-9]{32,}$/i; // Hash
        if (codePattern.test(firstValue) || hashPattern.test(firstValue)) {
            return FieldType.CODE;
        }
    }

    // Default to text
    return FieldType.TEXT;
}

/**
 * Determine if a field should be sortable
 *
 * @param fieldType - The field type
 * @returns True if field should be sortable
 */
export function isSortable(fieldType: FieldType): boolean {
    // Most types are sortable except hidden and complex types
    return fieldType !== FieldType.HIDDEN;
}


/**
 * Infer column definitions from an array of items
 *
 * Analyzes the data structure and applies conventions to determine
 * how each field should be rendered.
 *
 * @param items - Array of items to analyze
 * @param options - Inference options
 * @returns Array of inferred column definitions
 *
 * @example
 * ```typescript
 * const sessions = extractEmbeddedItems(response);
 * const columns = inferColumns(sessions);
 * // Returns: [
 * //   { key: 'id', label: 'ID', type: FieldType.CODE, sortable: true, hidden: true, priority: 60 },
 * //   { key: 'deviceName', label: 'Device Name', type: FieldType.TEXT, sortable: true, hidden: false, priority: 0 },
 * //   ...
 * // ]
 * ```
 */
export function inferColumns(
    items: HalObject[],
    options: InferenceOptions = {}
): InferredColumn[] {
    if (items.length === 0) {
        return [];
    }

    const sampleSize = options.sampleSize ?? 10;
    const sampledItems = items.slice(0, sampleSize);

    // Get all unique keys across sampled items
    const keys = getUniqueKeys(sampledItems, {
        excludeMetadata: true,
        sampleSize,
    });

    // Infer column definition for each key
    // Use index to preserve API order (priority = index)
    const columns: InferredColumn[] = keys.map((key, index) => {
        // Extract sample values for this key
        const sampleValues = sampledItems
            .map(item => item[key])
            .filter(v => v !== undefined);

        // Infer field type
        const fieldType = inferFieldType(key, sampleValues, options);

        // Determine if hidden
        const hidden = options.hideFields?.includes(key) ||
            (fieldType === FieldType.HIDDEN && !options.showFields?.includes(key));

        // Generate label
        const label = options.labelOverrides?.[key] || humanizeLabel(key);

        // Determine other properties
        const sortable = isSortable(fieldType);

        return {
            key,
            label,
            type: fieldType,
            sortable,
            hidden,
            // Use index to preserve API order; can be overridden via columnConfig
            priority: index,
        };
    });

    // Return columns in API order (no automatic sorting)
    return columns;
}

/**
 * Infer columns from items and apply visibility rules
 *
 * Returns only visible columns in API order.
 *
 * @param items - Array of items to analyze
 * @param options - Inference options
 * @returns Array of visible column definitions
 */
export function inferVisibleColumns(
    items: HalObject[],
    options: InferenceOptions = {}
): InferredColumn[] {
    const allColumns = inferColumns(items, options);
    return allColumns.filter(col => !col.hidden);
}
