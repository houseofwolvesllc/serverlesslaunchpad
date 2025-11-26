/**
 * Resource Utilities
 *
 * Pure utility functions for organizing and processing HAL resource data.
 * These functions are framework-agnostic and can be used in any context.
 */

import type { HalObject, InferredColumn, InferenceOptions } from '@houseofwolves/serverlesslaunchpad.web.commons';
import { extractResourceFields } from '@houseofwolves/serverlesslaunchpad.web.commons';

/**
 * Organized field sections for resource detail display
 */
export interface OrganizedFields {
    /** Primary identifying fields (name, title, label) */
    overview: InferredColumn[];
    /** All other non-hidden fields */
    details: InferredColumn[];
}

/**
 * Infer page title from a HAL resource
 *
 * Determines the best title for a resource detail page using the following priority:
 * 1. Self link title (from _links.self.title)
 * 2. Common title fields (title, name, label)
 * 3. First non-empty overview field value
 * 4. Default fallback
 *
 * @param resource - HAL resource to extract title from
 * @param overviewFields - Pre-computed overview fields (optional, will compute if not provided)
 * @param fallback - Default title if none can be inferred
 * @returns Inferred page title
 *
 * @example
 * ```typescript
 * const resource = {
 *   _links: { self: { href: '/users/123', title: 'John Doe' } },
 *   userId: '123',
 *   email: 'john@example.com'
 * };
 * inferPageTitle(resource); // Returns: "John Doe"
 * ```
 *
 * @example
 * ```typescript
 * const resource = {
 *   name: 'Admin User',
 *   userId: '456'
 * };
 * inferPageTitle(resource); // Returns: "Admin User"
 * ```
 */
export function inferPageTitle(
    resource: HalObject | null | undefined,
    overviewFields?: InferredColumn[],
    fallback: string = 'Resource Details'
): string {
    if (!resource) return fallback;

    // First priority: self link title
    const selfLink = resource._links?.self;
    if (selfLink) {
        const selfTitle = Array.isArray(selfLink) ? selfLink[0]?.title : selfLink.title;
        if (selfTitle) return String(selfTitle);
    }

    // Second priority: common title fields
    const titleField = resource.title || resource.name || resource.label;
    if (titleField) return String(titleField);

    // Third priority: first non-empty overview field value
    if (overviewFields) {
        for (const field of overviewFields) {
            const value = resource[field.key];
            if (value) return String(value);
        }
    }

    return fallback;
}

/**
 * Organize resource fields into overview and details sections
 *
 * Separates fields into two groups for display:
 * - Overview: Primary identifiers (name, title, label) that aren't hidden
 * - Details: All other non-hidden fields
 *
 * @param resource - HAL resource to organize
 * @param fieldConfig - Optional inference options for field customization
 * @returns Organized fields object with overview and details arrays
 *
 * @example
 * ```typescript
 * const resource = {
 *   userId: '123',
 *   name: 'John Doe',
 *   email: 'john@example.com',
 *   createdAt: '2024-01-01T00:00:00Z'
 * };
 *
 * const { overview, details } = organizeFields(resource);
 * // overview: [{ key: 'name', label: 'Name', ... }]
 * // details: [{ key: 'userId', ... }, { key: 'email', ... }, { key: 'createdAt', ... }]
 * ```
 *
 * @example
 * ```typescript
 * // With field configuration
 * const { overview, details } = organizeFields(resource, {
 *   hideFields: ['userId'],
 *   labelOverrides: { createdAt: 'Created' }
 * });
 * ```
 */
export function organizeFields(
    resource: HalObject | null | undefined,
    fieldConfig: InferenceOptions = {}
): OrganizedFields {
    if (!resource) {
        return { overview: [], details: [] };
    }

    // Extract all fields with type inference
    const allFields = extractResourceFields(resource, fieldConfig);

    // Separate into overview (primary identifiers) and details
    const overview = allFields.filter(field =>
        /^(name|title|label)$/i.test(field.key) && !field.hidden
    );

    const details = allFields.filter(field =>
        !/^(name|title|label)$/i.test(field.key) && !field.hidden
    );

    return { overview, details };
}

/**
 * Filter templates to only displayable actions in detail view
 *
 * Removes templates that shouldn't be shown in the detail view header:
 * - Navigation templates (self, default)
 * - Delete operations (belong in list views only)
 *
 * @param templates - Templates object from resource._templates
 * @returns Array of [key, template] entries that should be displayed
 *
 * @example
 * ```typescript
 * const resource = {
 *   _templates: {
 *     self: { method: 'GET', target: '/users/123' },
 *     default: { method: 'GET', target: '/users/123' },
 *     update: { method: 'PUT', target: '/users/123', properties: [...] },
 *     delete: { method: 'DELETE', target: '/users/123' }
 *   }
 * };
 *
 * const displayable = filterDisplayableTemplates(resource._templates);
 * // Returns: [['update', { method: 'PUT', ... }]]
 * // Filtered out: self, default, delete
 * ```
 */
export function filterDisplayableTemplates(
    templates: Record<string, any> | undefined
): Array<[string, any]> {
    if (!templates) return [];

    return Object.entries(templates).filter(([key, template]) => {
        // Filter out navigation templates (self, default)
        if (key === 'default' || key === 'self') return false;

        // Filter out delete operations (they belong in list views only)
        if (key === 'delete' || template.method === 'DELETE') return false;

        return true;
    });
}
