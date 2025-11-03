/**
 * HAL (Hypertext Application Language) Types
 *
 * Barrel export for all HAL-related types and utilities.
 * Used by both web (client) and api.hypermedia (server) packages.
 */

// Core HAL types
export type {
    HalLink,
    HalTemplateProperty,
    HalTemplate,
    HalObject,
    HalError
} from './hal.js';

// Collection types
export type { HalCollection } from './hal_collection.js';

// Utility functions
export {
    isHalObject,
    isHalCollection,
    isHalError,
    getLinkHref,
    hasLink,
    getEmbedded,
    getTemplate,
    hasTemplate
} from './hal_utils.js';
