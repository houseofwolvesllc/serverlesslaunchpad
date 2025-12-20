/**
 * Field Renderers - Type definitions for custom field rendering
 *
 * These types define the interface for custom field renderers in Svelte.
 * The actual rendering is done inline in the HalResourceRow component.
 */

import type { InferredColumn } from '@houseofwolves/serverlesslaunchpad.web.commons';

/**
 * Function type for custom field renderers
 * Returns a render function that can be used in Svelte templates
 */
export type FieldRenderer = (
    value: any,
    column: InferredColumn,
    item: any
) => {
    component?: any;
    props?: Record<string, any>;
    html?: string;
};

/**
 * Get the appropriate renderer for a column
 */
export function getFieldRenderer(
    column: InferredColumn,
    customRenderers?: Record<string, FieldRenderer>
): FieldRenderer | null {
    // Check for custom renderer first
    if (customRenderers && customRenderers[column.key]) {
        return customRenderers[column.key];
    }

    return null;
}
