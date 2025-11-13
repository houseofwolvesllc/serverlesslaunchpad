/**
 * Template Utilities
 *
 * Exports template categorization, execution, and confirmation utilities
 * for intelligent handling of HAL-FORMS templates in generic components.
 */

// Categorization
export { categorizeTemplate } from './categorization';
export type { TemplateCategory } from './categorization';

// Execution
export { buildTemplateData, getPropertySource } from './execution';
export type { TemplateExecutionContext, PropertySource } from './execution';

// Confirmation
export { getConfirmationConfig } from './confirmation';
export type { ConfirmationConfig } from './confirmation';
