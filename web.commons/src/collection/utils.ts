/**
 * Collection Utilities
 *
 * Utility functions for extracting and processing collection data from HAL resources.
 */

import type { HalObject } from '@houseofwolves/serverlesslaunchpad.types/hal';
import type { InferredColumn, InferenceOptions } from './types';
import { inferFieldType, isSortable } from './inference';

/**
 * Extract embedded items from a HAL resource
 *
 * Searches the _embedded property for arrays of items. Supports common
 * collection naming patterns like 'items', 'results', or resource-specific names.
 *
 * @param resource - HAL resource with _embedded property
 * @param embeddedKey - Optional specific key to extract (auto-detects if not provided)
 * @returns Array of HAL objects (items)
 *
 * @example
 * ```typescript
 * const response = await apiClient.get('/users/123/sessions');
 * const sessions = extractEmbeddedItems(response);
 * // Returns: array of session objects from response._embedded.sessions
 * ```
 */
export function extractEmbeddedItems(
    resource: HalObject,
    embeddedKey?: string
): HalObject[] {
    if (!resource._embedded) {
        return [];
    }

    // If specific key provided, use it
    if (embeddedKey) {
        const items = resource._embedded[embeddedKey];
        return Array.isArray(items) ? items : [];
    }

    // Auto-detect: Look for common collection keys
    const commonKeys = ['items', 'results', 'data', 'records'];

    for (const key of commonKeys) {
        const items = resource._embedded[key];
        if (Array.isArray(items)) {
            return items;
        }
    }

    // If no common key found, get first array property
    for (const key of Object.keys(resource._embedded)) {
        const value = resource._embedded[key];
        if (Array.isArray(value)) {
            return value;
        }
    }

    return [];
}

/**
 * Humanize a field name for display
 *
 * Converts camelCase, snake_case, or kebab-case to human-readable text.
 *
 * @param fieldName - Field name to humanize
 * @returns Human-readable label
 *
 * @example
 * ```typescript
 * humanizeLabel('createdAt')      // "Created At"
 * humanizeLabel('user_name')      // "User Name"
 * humanizeLabel('api-key-id')     // "Api Key Id"
 * humanizeLabel('isActive')       // "Is Active"
 * ```
 */
export function humanizeLabel(fieldName: string): string {
    // Handle acronyms and special cases
    const acronyms: Record<string, string> = {
        'id': 'ID',
        'api': 'API',
        'url': 'URL',
        'uri': 'URI',
        'uuid': 'UUID',
        'ip': 'IP',
        'http': 'HTTP',
        'https': 'HTTPS',
        'aws': 'AWS',
        'sdk': 'SDK',
        'ui': 'UI',
        'ux': 'UX',
    };

    // Remove leading/trailing underscores or hyphens
    let result = fieldName.replace(/^[_-]+|[_-]+$/g, '');

    // Split on camelCase, snake_case, or kebab-case boundaries
    result = result
        // Insert space before uppercase letters (camelCase)
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        // Replace underscores and hyphens with spaces
        .replace(/[_-]/g, ' ')
        // Split on number boundaries
        .replace(/([a-zA-Z])(\d)/g, '$1 $2')
        .replace(/(\d)([a-zA-Z])/g, '$1 $2');

    // Capitalize each word
    const words = result.split(/\s+/).map(word => {
        const lower = word.toLowerCase();
        // Check if it's an acronym
        if (acronyms[lower]) {
            return acronyms[lower];
        }
        // Capitalize first letter
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });

    return words.join(' ');
}

/**
 * Get all unique keys from an array of objects
 *
 * Analyzes multiple objects to find all property keys, useful for
 * discovering available fields across a collection.
 *
 * @param items - Array of objects to analyze
 * @param options - Options for key extraction
 * @returns Array of unique keys found
 */
export function getUniqueKeys(
    items: Record<string, any>[],
    options: {
        /** Exclude keys starting with underscore (HAL metadata) */
        excludeMetadata?: boolean;
        /** Maximum number of items to sample */
        sampleSize?: number;
    } = {}
): string[] {
    const { excludeMetadata = true, sampleSize = 10 } = options;
    const keys = new Set<string>();

    // Sample items for performance
    const sampled = items.slice(0, sampleSize);

    for (const item of sampled) {
        if (typeof item === 'object' && item !== null) {
            for (const key of Object.keys(item)) {
                // Skip HAL metadata fields if requested
                if (excludeMetadata && key.startsWith('_')) {
                    continue;
                }
                keys.add(key);
            }
        }
    }

    return Array.from(keys);
}

/**
 * Check if a value matches a date pattern
 *
 * @param value - Value to check
 * @returns True if value appears to be a date
 */
export function isDateValue(value: any): boolean {
    if (typeof value === 'string') {
        // Check ISO 8601 format (strict)
        const iso8601Pattern = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
        if (iso8601Pattern.test(value)) {
            return true;
        }

        // Check common date formats (more restrictive)
        // Only accept strings that look like dates, not arbitrary text
        const commonDatePattern = /^\d{1,2}\/\d{1,2}\/\d{2,4}$/; // MM/DD/YYYY or DD/MM/YYYY
        const timestampPattern = /^\d{10,13}$/; // Unix timestamp

        if (commonDatePattern.test(value) || timestampPattern.test(value)) {
            const date = new Date(value);
            return !isNaN(date.getTime());
        }
    }

    return false;
}

/**
 * Check if a value matches a URL pattern
 *
 * @param value - Value to check
 * @returns True if value appears to be a URL
 */
export function isUrlValue(value: any): boolean {
    if (typeof value !== 'string') {
        return false;
    }

    try {
        new URL(value);
        return true;
    } catch {
        return false;
    }
}

/**
 * Check if a value matches an email pattern
 *
 * @param value - Value to check
 * @returns True if value appears to be an email
 */
export function isEmailValue(value: any): boolean {
    if (typeof value !== 'string') {
        return false;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(value);
}

/**
 * Check if a field name matches any of the given patterns
 *
 * @param fieldName - Field name to check
 * @param patterns - Array of regex patterns
 * @returns True if field name matches any pattern
 */
export function matchesPattern(fieldName: string, patterns: RegExp[]): boolean {
    return patterns.some(pattern => pattern.test(fieldName));
}

/**
 * Get pagination info from HAL resource
 *
 * @param resource - HAL resource to extract pagination from
 * @returns Pagination info if available
 */
export function getPaginationInfo(resource: HalObject): {
    page: number;
    size: number;
    total?: number;
} | undefined {
    // Check common pagination property locations
    const page = resource.page as any;
    if (page && typeof page === 'object') {
        return {
            page: page.number ?? page.page ?? 0,
            size: page.size ?? page.limit ?? 10,
            total: page.totalElements ?? page.total,
        };
    }

    // Check root level properties
    if (typeof resource.page === 'number' || typeof resource.size === 'number') {
        return {
            page: resource.page as number ?? 0,
            size: resource.size as number ?? 10,
            total: resource.total as number,
        };
    }

    return undefined;
}

/**
 * Extract and infer field definitions from a single HAL resource
 *
 * Analyzes a resource object and extracts all non-metadata fields with type inference.
 * Excludes HAL metadata (_links, _templates, _embedded) and applies the same type
 * inference system used for collection columns.
 *
 * @param resource - HAL resource to extract fields from
 * @param options - Inference options for customization
 * @returns Array of inferred field definitions in API order
 *
 * @example
 * ```typescript
 * const response = await apiClient.get('/users/123');
 * const fields = extractResourceFields(response, {
 *   fieldTypeOverrides: { email: FieldType.EMAIL },
 *   labelOverrides: { userId: 'User ID' }
 * });
 * // Returns: [
 * //   { key: 'userId', label: 'User ID', type: FieldType.CODE, value: '123', ... },
 * //   { key: 'email', label: 'Email', type: FieldType.EMAIL, value: 'user@example.com', ... },
 * //   ...
 * // ]
 * ```
 */
export function extractResourceFields(
    resource: HalObject | null | undefined,
    options: InferenceOptions = {}
): InferredColumn[] {
    if (!resource) {
        return [];
    }

    // Get all keys excluding HAL metadata
    const metadataKeys = ['_links', '_templates', '_embedded'];
    const keys = Object.keys(resource)
        .filter(key => !metadataKeys.includes(key));

    // Infer field definition for each key
    const fields: InferredColumn[] = keys.map((key, index) => {
        const value = resource[key];

        // Infer field type from key name and value
        const fieldType = inferFieldType(key, [value], options);

        // Determine if hidden
        const hidden = options.hideFields?.includes(key) || false;

        // Generate label
        const label = options.labelOverrides?.[key] || humanizeLabel(key);

        // Determine sortable
        const sortable = isSortable(fieldType);

        // Priority is simply the position in the API response
        const priority = index;

        return {
            key,
            label,
            type: fieldType,
            sortable,
            hidden,
            priority,
        };
    });

    return fields;
}
