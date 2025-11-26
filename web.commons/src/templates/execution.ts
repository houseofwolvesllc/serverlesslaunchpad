/**
 * Template Execution Context Utility
 *
 * Provides utilities for building template execution data from various sources:
 * - Explicit values (from template property values)
 * - UI selections (from table checkboxes)
 * - Form inputs (from modal forms)
 * - Resource data (from current resource object)
 *
 * This enables context-aware template execution without hardcoding data sources.
 */

import type { HalTemplate, HalTemplateProperty, HalObject } from '@houseofwolves/serverlesslaunchpad.types/hal';

/**
 * Template execution context
 *
 * Contains all possible data sources for populating template properties:
 * - template: The template to execute
 * - formData: Data from form inputs (for create/update operations)
 * - selections: Selected item IDs (for bulk operations)
 * - resource: Current resource object (for single-item operations)
 */
export interface TemplateExecutionContext {
    /** The template to execute */
    template: HalTemplate;

    /** Data from form inputs (for form templates) */
    formData?: Record<string, any>;

    /** Selected item IDs (for bulk operations) */
    selections?: string[];

    /** Current resource (for single-item operations) */
    resource?: HalObject | null;
}

/**
 * Property data source types
 *
 * - value: Use explicit value from property.value (hidden fields)
 * - selection: Use selections from UI (bulk operations)
 * - form: Use form data or resource data
 */
export type PropertySource = 'value' | 'selection' | 'form';

/**
 * Determine the data source for a template property
 *
 * Uses conventions to detect where property value should come from:
 * 1. If property has explicit value → use it (hidden fields)
 * 2. If property is array or ends with "Ids" → use selections (bulk operations)
 * 3. Otherwise → use form data or resource data
 *
 * @param property - The template property
 * @returns The property source type
 *
 * @example
 * ```typescript
 * // Hidden field with value
 * getPropertySource({ name: 'cursor', type: 'hidden', value: 'abc123' });
 * // Returns: 'value'
 *
 * // Array property (bulk operation)
 * getPropertySource({ name: 'sessionIds', type: 'array', required: true });
 * // Returns: 'selection'
 *
 * // Regular form field
 * getPropertySource({ name: 'label', type: 'text', required: true });
 * // Returns: 'form'
 * ```
 */
export function getPropertySource(property: HalTemplateProperty): PropertySource {
    // Explicit value takes precedence (for any field type)
    // This includes hidden fields AND pre-filled form fields
    if (property.value !== undefined) {
        return 'value';
    }

    // From selections (bulk operations)
    // Convention: array properties or properties ending in "Ids" come from selections
    if (property.type === 'array' || property.name.endsWith('Ids')) {
        return 'selection';
    }

    // Default: from form or resource
    return 'form';
}

/**
 * Build template execution data from context
 *
 * Populates template properties from appropriate data sources based on conventions.
 * Throws errors for missing required fields.
 *
 * @param context - The execution context with all possible data sources
 * @returns Object with property values ready for template execution
 * @throws Error if required field is missing
 *
 * @example
 * ```typescript
 * // Navigation template with hidden cursor
 * buildTemplateData({
 *   template: {
 *     properties: [{ name: 'cursor', type: 'hidden', value: 'abc123' }]
 *   }
 * });
 * // Returns: { cursor: 'abc123' }
 *
 * // Bulk delete with selections
 * buildTemplateData({
 *   template: {
 *     properties: [{ name: 'sessionIds', type: 'array', required: true }]
 *   },
 *   selections: ['id1', 'id2', 'id3']
 * });
 * // Returns: { sessionIds: ['id1', 'id2', 'id3'] }
 *
 * // Create form with form data
 * buildTemplateData({
 *   template: {
 *     properties: [
 *       { name: 'label', type: 'text', required: true },
 *       { name: 'description', type: 'textarea' }
 *     ]
 *   },
 *   formData: { label: 'My Label', description: 'My Description' }
 * });
 * // Returns: { label: 'My Label', description: 'My Description' }
 * ```
 */
export function buildTemplateData(context: TemplateExecutionContext): Record<string, any> {
    const data: Record<string, any> = {};

    for (const prop of context.template.properties ?? []) {
        // Skip read-only properties - they should not be submitted
        if (prop.readOnly) {
            continue;
        }

        const source = getPropertySource(prop);

        switch (source) {
            case 'value':
                // Use explicit value (hidden fields)
                data[prop.name] = prop.value;
                break;

            case 'selection':
                // Use selections from table (bulk operations)
                if (!context.selections || context.selections.length === 0) {
                    if (prop.required) {
                        throw new Error(`At least one item must be selected for ${prop.name}`);
                    }
                } else {
                    data[prop.name] = context.selections;
                }
                break;

            case 'form':
                // Use form data or resource data
                // Priority: formData > resource > property.value (for pre-filled forms)
                if (context.formData && prop.name in context.formData) {
                    data[prop.name] = context.formData[prop.name];
                } else if (context.resource && prop.name in context.resource) {
                    data[prop.name] = context.resource[prop.name];
                } else if (prop.value !== undefined) {
                    // Fallback to property.value for pre-filled fields
                    data[prop.name] = prop.value;
                } else if (prop.required) {
                    throw new Error(`Required field ${prop.name} is missing`);
                }
                break;
        }
    }

    return data;
}
