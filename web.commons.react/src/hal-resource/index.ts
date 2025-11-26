/**
 * HAL Resource Module
 *
 * Provides React hooks and utilities for working with HAL resource detail views.
 * Exports framework-agnostic business logic that can be used across different
 * UI frameworks (Mantine, shadcn/ui, DaisyUI).
 */

// Hook exports
export {
    useHalResourceDetail,
    type UseHalResourceDetailResult,
    type UseHalResourceDetailParams,
    type FieldRenderer,
    type TemplateActionResult,
} from './use_hal_resource_detail';

// Utility exports
export {
    inferPageTitle,
    organizeFields,
    filterDisplayableTemplates,
    type OrganizedFields,
} from './resource_utils';
