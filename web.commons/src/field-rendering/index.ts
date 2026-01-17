/**
 * Field Rendering Utilities
 *
 * Pure utility functions for rendering field values across different UI frameworks.
 * These utilities are framework-agnostic and can be used by React, Svelte, or any
 * other frontend framework.
 *
 * @module field-rendering
 */

export {
    getEnumPropertyFromTemplates,
    determineBadgeVariant,
    formatDateValue,
    evaluateBooleanValue,
    shortenUrl,
    getNullValuePlaceholder,
    isArrayValue,
    isNullish,
    isEmpty,
    isValidDate,
    type BadgeVariant,
} from './field_rendering_utils';
