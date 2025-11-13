/**
 * Confirmation Dialog Utility
 *
 * Generates smart confirmation messages for action templates based on:
 * - Operation type (DELETE vs other)
 * - Bulk vs single-item operations
 * - Selection count
 *
 * Provides appropriate styling hints (destructive for DELETE operations).
 */

import type { HalTemplate } from '@houseofwolves/serverlesslaunchpad.types/hal';
import type { TemplateExecutionContext } from './execution';

/**
 * Confirmation dialog configuration
 */
export interface ConfirmationConfig {
    /** Dialog title */
    title: string;

    /** Confirmation message */
    message: string;

    /** Confirm button label (default: "Confirm") */
    confirmLabel?: string;

    /** Cancel button label (default: "Cancel") */
    cancelLabel?: string;

    /** Visual variant (default: "default") */
    variant?: 'default' | 'destructive';
}

/**
 * Generate confirmation dialog configuration
 *
 * Creates smart confirmation messages based on:
 * - Template method (DELETE gets destructive styling)
 * - Selection count (bulk operations show count)
 * - Operation type
 *
 * @param template - The template being executed
 * @param context - The execution context (for selection count)
 * @returns Confirmation dialog configuration
 *
 * @example
 * ```typescript
 * // Bulk delete with 3 items selected
 * getConfirmationConfig(
 *   { method: 'DELETE', title: 'Delete Sessions' },
 *   { selections: ['id1', 'id2', 'id3'] }
 * );
 * // Returns: {
 * //   title: 'Delete Sessions',
 * //   message: 'Are you sure you want to delete 3 items? This action cannot be undone.',
 * //   confirmLabel: 'Delete',
 * //   cancelLabel: 'Cancel',
 * //   variant: 'destructive'
 * // }
 *
 * // Single-item delete
 * getConfirmationConfig(
 *   { method: 'DELETE', title: 'Delete Session' },
 *   { resource: { sessionId: 'abc123' } }
 * );
 * // Returns: {
 * //   title: 'Delete Session',
 * //   message: 'Are you sure you want to delete this item? This action cannot be undone.',
 * //   confirmLabel: 'Delete',
 * //   variant: 'destructive'
 * // }
 *
 * // Generic action
 * getConfirmationConfig(
 *   { method: 'POST', title: 'Archive Items' },
 *   { selections: ['id1', 'id2'] }
 * );
 * // Returns: {
 * //   title: 'Archive Items',
 * //   message: 'Apply this action to 2 items?',
 * //   confirmLabel: 'Confirm',
 * //   variant: 'default'
 * // }
 * ```
 */
export function getConfirmationConfig(
    template: HalTemplate,
    context: TemplateExecutionContext
): ConfirmationConfig {
    const title = template.title || 'Confirm Action';
    let message: string;

    // Bulk operations - show count
    if (context.selections && context.selections.length > 0) {
        const count = context.selections.length;
        const noun = count === 1 ? 'item' : 'items';

        if (template.method === 'DELETE') {
            message = `Are you sure you want to delete ${count} ${noun}? This action cannot be undone.`;
        } else {
            message = `Apply this action to ${count} ${noun}?`;
        }
    }
    // Single item operations
    else if (template.method === 'DELETE') {
        message = 'Are you sure you want to delete this item? This action cannot be undone.';
    }
    // Generic confirmation
    else {
        message = `Are you sure you want to ${template.title}?`;
    }

    return {
        title,
        message,
        confirmLabel: template.method === 'DELETE' ? 'Delete' : 'Confirm',
        cancelLabel: 'Cancel',
        variant: template.method === 'DELETE' ? 'destructive' : 'default',
    };
}
