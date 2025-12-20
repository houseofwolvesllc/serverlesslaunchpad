/**
 * HAL Collection Components - Exports
 *
 * Generic components for displaying HAL collections with automatic column inference
 */

export { default as HalCollectionList } from './HalCollectionList.svelte';
export { default as HalResourceRow } from './HalResourceRow.svelte';
export type { FieldRenderer } from './field_renderers';
export { getFieldRenderer } from './field_renderers';

// Re-export BulkOperation from web.commons for convenience
export type { BulkOperation, BulkOperationVariant } from '@houseofwolves/serverlesslaunchpad.web.commons';
