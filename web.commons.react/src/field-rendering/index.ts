/**
 * Field Rendering Utilities
 *
 * Pure utility functions for rendering field values across different UI frameworks.
 * These utilities are extracted from React field renderers and provide framework-agnostic
 * logic for common field rendering tasks.
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
