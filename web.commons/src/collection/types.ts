/**
 * Collection Inference Types
 *
 * Type definitions for convention-based collection rendering from HAL resources.
 */

import type { HalObject } from '@houseofwolves/serverlesslaunchpad.types/hal';

/**
 * Field type enum for rendering strategies
 */
export enum FieldType {
    /** Plain text field */
    TEXT = 'text',
    /** Numeric value */
    NUMBER = 'number',
    /** Date or datetime */
    DATE = 'date',
    /** Code snippet or technical identifier */
    CODE = 'code',
    /** Badge/pill display (status, enum, etc.) */
    BADGE = 'badge',
    /** Boolean value */
    BOOLEAN = 'boolean',
    /** URL/Link */
    URL = 'url',
    /** Email address */
    EMAIL = 'email',
    /** Hidden field (not displayed) */
    HIDDEN = 'hidden',
}

/**
 * Column definition inferred from data
 */
export interface InferredColumn {
    /** Field key in the data object */
    key: string;

    /** Human-readable label (humanized from key) */
    label: string;

    /** Inferred field type for rendering */
    type: FieldType;

    /** Whether this column should be sortable */
    sortable: boolean;

    /** Whether this column should be hidden by default */
    hidden: boolean;

    /** Priority/order for display (defaults to API order, can be overridden) */
    priority: number;

    /** Optional column width (e.g., "200px", "20%") */
    width?: string;

    /** Text to display when value is null/undefined/empty */
    nullText?: string;
}

/**
 * Extracted collection data from HAL resource
 */
export interface CollectionData {
    /** Array of items extracted from _embedded */
    items: HalObject[];

    /** Inferred column definitions */
    columns: InferredColumn[];

    /** Total count if available in HAL resource */
    total?: number;

    /** Page information if available */
    page?: {
        number: number;
        size: number;
    };
}

/**
 * Field naming conventions for type detection
 */
export interface FieldConventions {
    /** Patterns for date fields */
    datePatterns: RegExp[];

    /** Patterns for code/technical fields */
    codePatterns: RegExp[];

    /** Patterns for badge/status fields */
    badgePatterns: RegExp[];

    /** Patterns for URL fields */
    urlPatterns: RegExp[];

    /** Patterns for email fields */
    emailPatterns: RegExp[];

    /** Patterns for hidden fields */
    hiddenPatterns: RegExp[];

    /** Patterns for boolean fields */
    booleanPatterns: RegExp[];
}

/**
 * Options for collection inference
 */
export interface InferenceOptions {
    /** Custom field conventions (merges with defaults) */
    conventions?: Partial<FieldConventions>;

    /** Maximum number of items to analyze for inference (default: 10) */
    sampleSize?: number;

    /** Fields to always hide */
    hideFields?: string[];

    /** Fields to always show (overrides conventions) */
    showFields?: string[];

    /** Custom field type overrides */
    fieldTypeOverrides?: Record<string, FieldType>;

    /** Custom label overrides */
    labelOverrides?: Record<string, string>;

    /** If true, sort columns by priority instead of preserving API order (default: false) */
    sortByPriority?: boolean;
}
