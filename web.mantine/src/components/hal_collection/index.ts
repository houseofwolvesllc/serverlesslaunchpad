/**
 * HAL Collection Components - Exports
 *
 * Generic components for displaying HAL collections with automatic column inference
 */

export { HalCollectionList } from './hal_collection_list';
export type { HalCollectionListProps } from './hal_collection_list';

// Re-export BulkOperation from web.commons for convenience
export type { BulkOperation, BulkOperationVariant } from '@houseofwolves/serverlesslaunchpad.web.commons';

export { HalResourceRow } from './hal_resource_row';
export type { HalResourceRowProps } from './hal_resource_row';

export {
    TextRenderer,
    CodeRenderer,
    DateRenderer,
    BadgeRenderer,
    BooleanRenderer,
    NumberRenderer,
    EmailRenderer,
    UrlRenderer,
    HiddenRenderer,
    DEFAULT_FIELD_RENDERERS,
    getFieldRenderer,
} from './field_renderers';
export type { FieldRenderer } from './field_renderers';
