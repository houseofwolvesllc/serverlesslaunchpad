/**
 * Transform form-encoded data to match schema expectations
 *
 * Handles:
 * - Comma-separated arrays
 * - Boolean string conversion
 * - Nested JSON parsing (for complex objects like pagingInstruction)
 * - Empty string handling
 * - Type inference based on field names
 */
export function transformFormData(
    formData: Record<string, any>
): Record<string, any> {
    const transformed: Record<string, any> = {};

    for (const [key, value] of Object.entries(formData)) {
        // Skip undefined values
        if (value === undefined) {
            continue;
        }

        // Handle array fields based on naming conventions FIRST (before empty string handling)
        // Fields ending with 'Ids', '[]', 'List', or 'Keys' should be arrays
        if (typeof value === 'string' && isArrayField(key)) {
            const arrayKey = key.replace('[]', '');
            // Handle empty strings as empty arrays for array fields
            if (value === '') {
                transformed[arrayKey] = [];
                continue;
            }
            // Split by comma if present, otherwise create single-item array
            if (value.includes(',')) {
                transformed[arrayKey] = value
                    .split(',')
                    .map(v => v.trim())
                    .filter(v => v);
            } else {
                // Single value - wrap in array
                transformed[arrayKey] = [value.trim()];
            }
            continue;
        }

        // Handle empty strings (convert to undefined for optional fields)
        if (value === '') {
            transformed[key] = undefined;
            continue;
        }

        // Handle boolean strings
        if (value === 'true') {
            transformed[key] = true;
            continue;
        }
        if (value === 'false') {
            transformed[key] = false;
            continue;
        }

        // Handle JSON strings (like pagingInstruction)
        if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
            try {
                transformed[key] = JSON.parse(value);
                continue;
            } catch {
                // Not valid JSON, treat as string
            }
        }

        // Handle arrays (already parsed by qs)
        if (Array.isArray(value)) {
            const arrayKey = key.replace('[]', '');
            transformed[arrayKey] = value;
            continue;
        }

        // Handle nested objects (already parsed by qs)
        if (typeof value === 'object' && value !== null) {
            // Recursively transform nested objects
            transformed[key] = transformFormData(value);
            continue;
        }

        // Default: preserve as-is
        transformed[key] = value;
    }

    return transformed;
}

/**
 * Check if a field should be treated as an array based on naming conventions
 */
export function isArrayField(fieldName: string): boolean {
    return fieldName.endsWith('Ids') ||
           fieldName.endsWith('[]') ||
           fieldName.endsWith('List') ||
           fieldName.endsWith('Keys');
}

/**
 * Parse comma-separated string into array
 */
export function parseCommaSeparated(value: string): string[] {
    return value
        .split(',')
        .map(v => v.trim())
        .filter(v => v);
}
