/**
 * Template Categorization Utility
 *
 * Provides convention-based categorization of HAL-FORMS templates into three types:
 * - navigation: Templates for navigation (pagination, self-reference)
 * - form: Templates that require user input forms
 * - action: Templates that require confirmation dialogs
 *
 * This enables appropriate UX patterns for each template type without requiring
 * explicit metadata from the API.
 */

import type { HalTemplate } from '@houseofwolves/serverlesslaunchpad.types/hal';

/**
 * Template category types
 *
 * - navigation: Execute immediately, navigate to result (e.g., pagination)
 * - form: Show modal with form, refresh on success (e.g., create, update)
 * - action: Show confirmation dialog, refresh on success (e.g., delete)
 */
export type TemplateCategory = 'navigation' | 'form' | 'action';

/**
 * Categorize a template based on HTTP method and field visibility
 *
 * Uses a simplified approach based on HTTP semantics and whether the template
 * requires user input:
 *
 * 1. Navigation: GET/POST with all hidden fields
 * 2. Form: Any template with visible fields
 * 3. Action: PUT/DELETE/PATCH with all hidden fields
 *
 * @param key - The template key from _templates object (unused, kept for API compatibility)
 * @param template - The HAL template object
 * @returns The template category
 *
 * @example
 * ```typescript
 * // Navigation template (POST to collection with hidden userId)
 * categorizeTemplate('sessions', {
 *   method: 'POST',
 *   target: '/users/123/sessions',
 *   properties: [{ name: 'userId', type: 'hidden', value: '123' }]
 * }); // Returns: 'navigation'
 *
 * // Navigation template (GET pagination with hidden cursor)
 * categorizeTemplate('next', {
 *   method: 'GET',
 *   properties: [{ name: 'cursor', type: 'hidden', value: 'abc' }]
 * }); // Returns: 'navigation'
 *
 * // Form template (POST with visible fields)
 * categorizeTemplate('create', {
 *   method: 'POST',
 *   properties: [{ name: 'label', type: 'text', required: true }]
 * }); // Returns: 'form'
 *
 * // Action template (DELETE with all hidden fields)
 * categorizeTemplate('delete', {
 *   method: 'DELETE',
 *   properties: [{ name: 'id', type: 'hidden', value: '123' }]
 * }); // Returns: 'action'
 *
 * // Form template (DELETE with visible reason field)
 * categorizeTemplate('delete', {
 *   method: 'DELETE',
 *   properties: [{ name: 'reason', type: 'text', required: true }]
 * }); // Returns: 'form'
 * ```
 */
export function categorizeTemplate(_key: string, template: HalTemplate): TemplateCategory {
    // Check if all fields are hidden (or no fields at all)
    const allHidden = template.properties?.every((p) => p.type === 'hidden') ?? true;

    if (allHidden) {
        // All hidden fields - categorize by HTTP method
        const method = template.method?.toUpperCase();

        if (method === 'GET' || method === 'POST') {
            // GET/POST with all hidden → navigation
            // These are parameterized navigation actions (pagination, collection access)
            return 'navigation';
        } else {
            // PUT/DELETE/PATCH with all hidden → action
            // These are pre-configured mutations that require confirmation
            return 'action';
        }
    } else {
        // Has visible fields → form
        // Any template with visible fields requires user input via form dialog
        // This includes DELETE operations that need additional data (e.g., reason)
        return 'form';
    }
}
