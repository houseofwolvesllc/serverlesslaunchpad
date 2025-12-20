/**
 * HAL Collection Components - Barrel exports
 *
 * Generic, hypermedia-driven collection components that eliminate
 * feature-specific list/table boilerplate.
 */

export { HalCollectionList } from './hal_collection_list';
export type { HalCollectionListProps } from './hal_collection_list';

export { HalResourceRow } from './hal_resource_row';
export type { HalResourceRowProps } from './hal_resource_row';

export {
    DEFAULT_FIELD_RENDERERS,
    TextRenderer,
    CodeRenderer,
    DateRenderer,
    BadgeRenderer,
    BooleanRenderer,
    NumberRenderer,
    EmailRenderer,
    UrlRenderer,
    HiddenRenderer,
    getFieldRenderer,
} from './field_renderers';
export type { FieldRenderer } from './field_renderers';

export {
    EmptyState,
    EmptyCollection,
    EmptySearchResults,
    ErrorState,
} from './empty_states';
export type { EmptyStateProps } from './empty_states';

export {
    CollectionSkeleton,
    TableRowSkeleton,
    CollectionToolbarSkeleton,
    CardListSkeleton,
    DetailSkeleton,
} from './loading_skeletons';
export type { CollectionSkeletonProps } from './loading_skeletons';
