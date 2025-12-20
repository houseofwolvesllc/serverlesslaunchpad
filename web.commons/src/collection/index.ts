/**
 * Collection Module - Convention-based hypermedia collection inference
 *
 * Automatically extracts and infers collection structure from HAL resources.
 */

// Main API
export {
    extractCollection,
    isCollection,
    getCollectionKey,
} from './collection';

// Inference
export {
    inferColumns,
    inferVisibleColumns,
    inferFieldType,
    isSortable,
} from './inference';

// Utilities
export {
    extractEmbeddedItems,
    extractResourceFields,
    humanizeLabel,
    getUniqueKeys,
    isDateValue,
    isUrlValue,
    isEmailValue,
    matchesPattern,
    getPaginationInfo,
} from './utils';

// Conventions
export {
    DEFAULT_CONVENTIONS,
    mergeConventions,
} from './conventions';

// Types
export {
    FieldType,
    type InferredColumn,
    type CollectionData,
    type FieldConventions,
    type InferenceOptions,
    type BulkOperation,
    type BulkOperationVariant,
} from './types';
