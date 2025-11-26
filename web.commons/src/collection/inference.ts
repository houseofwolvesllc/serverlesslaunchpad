/**
 * Collection Inference Engine
 *
 * Automatically infers column definitions and field types from collection data.
 * Uses naming conventions and value inspection to determine rendering strategies.
 */

import type { HalObject } from '@houseofwolves/serverlesslaunchpad.types/hal';
import { FieldType, InferredColumn, InferenceOptions } from './types';
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
 * Determine display priority for a field
 *
 * Lower numbers = higher priority (displayed first/leftmost)
 *
 * @param fieldName - Field name
 * @param fieldType - Field type
 * @returns Priority number (0-100)
 */
export function getFieldPriority(fieldName: string, fieldType: FieldType): number {
    // Hidden fields get lowest priority
    if (fieldType === FieldType.HIDDEN) {
        return 100;
    }

    // Primary identifier fields (name, title, label) get highest priority
    if (/^(name|title|label)$/i.test(fieldName)) {
        return 0;
    }

    // Status/badge fields get high priority
    if (fieldType === FieldType.BADGE) {
        return 10;
    }

    // Date fields are important but not primary
    if (fieldType === FieldType.DATE) {
        return 20;
    }

    // Text and email fields
    if (fieldType === FieldType.TEXT || fieldType === FieldType.EMAIL) {
        return 30;
    }

    // Numbers and booleans
    if (fieldType === FieldType.NUMBER || fieldType === FieldType.BOOLEAN) {
        return 40;
    }

    // Code and technical fields lower priority
    if (fieldType === FieldType.CODE) {
        return 60;
    }

    // URLs lowest priority (often long)
    if (fieldType === FieldType.URL) {
        return 70;
    }

    // Default medium priority
    return 50;
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
    const columns: InferredColumn[] = keys.map((key) => {
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

        // Calculate semantic priority based on field name and type
        // Lower numbers = higher priority (displayed first)
        const priority = getFieldPriority(key, fieldType);

        return {
            key,
            label,
            type: fieldType,
            sortable,
            hidden,
            priority,
        };
    });

    // Sort by priority (semantic importance) by default
    // Can be disabled via sortByPriority: false to preserve API order
    const shouldSort = options.sortByPriority !== false;
    return shouldSort
        ? columns.sort((a, b) => a.priority - b.priority)
        : columns;
}

/**
 * Infer columns from items and apply visibility rules
 *
 * Returns only visible columns, sorted by priority.
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
