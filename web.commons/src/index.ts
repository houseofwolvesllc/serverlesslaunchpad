/**
 * web.commons - Framework-agnostic shared utilities for all web frontend projects
 *
 * This package contains pure TypeScript code with no framework dependencies,
 * allowing it to be used by both React and Svelte projects.
 *
 * @packageDocumentation
 */

// ============================================================================
// Services - API communication and hypermedia navigation
// ============================================================================

export {
    ApiClient,
    createApiClient,
    ApiClientError,
    type ApiResponse,
    type ApiError,
    type ApiClientConfig,
} from './services/api_client';

export {
    EntryPoint,
    createEntryPoint,
    type EntryPointConfig,
} from './services/entry_point';

export {
    LinkNavigator,
    createLinkNavigator,
    linkNavigator, // Singleton instance
} from './services/link_navigator';

// ============================================================================
// HAL-FORMS Client - Template execution and validation
// ============================================================================

export {
    HalFormsClient,
    createHalFormsClient,
    type ValidationError,
} from './lib/hal_forms_client';

// ============================================================================
// Configuration - Web app configuration management
// ============================================================================

export {
    WebConfigurationStore,
    createWebConfigStore,
    type ConfigLoader,
} from './configuration/web_config_store';

export {
    WebConfigSchema,
    type WebConfig,
} from './configuration/web_config_schema';

// ============================================================================
// Logging - Structured logging utilities
// ============================================================================

export {
    createWebLogger,
    getLogLevelForEnvironment,
    LOG_LEVEL_MAP,
    LogLevel,
    ConsoleLogger,
    type Logger,
    type LogContext,
} from './logging/logger';

// ============================================================================
// HAL Types - Re-export from types package for convenience
// ============================================================================

export type {
    HalLink,
    HalTemplateProperty,
    HalTemplate,
    HalObject,
    HalError,
    HalCollection,
} from '@houseofwolves/serverlesslaunchpad.types/hal';

export {
    isHalObject,
    isHalCollection,
    isHalError,
    getLinkHref,
    hasLink,
    getEmbedded,
    getTemplate,
    hasTemplate,
} from '@houseofwolves/serverlesslaunchpad.types/hal';

// ============================================================================
// Collection - Hypermedia collection inference
// ============================================================================

export {
    extractCollection,
    isCollection,
    getCollectionKey,
    inferColumns,
    inferVisibleColumns,
    inferFieldType,
    isSortable,
    getFieldPriority,
    extractEmbeddedItems,
    extractResourceFields,
    humanizeLabel,
    getUniqueKeys,
    isDateValue,
    isUrlValue,
    isEmailValue,
    matchesPattern,
    getPaginationInfo,
    DEFAULT_CONVENTIONS,
    mergeConventions,
    FieldType,
    type InferredColumn,
    type CollectionData,
    type FieldConventions,
    type InferenceOptions,
} from './collection';

// ============================================================================
// Templates - Template categorization and execution
// ============================================================================

export {
    categorizeTemplate,
    buildTemplateData,
    getPropertySource,
    getConfirmationConfig,
    type TemplateCategory,
    type TemplateExecutionContext,
    type PropertySource,
    type ConfirmationConfig,
} from './templates';

// ============================================================================
// Enums - Enum translation and bitflag utilities
// ============================================================================

export {
    getEnumLabel,
    getEnumOptions,
    isEnumProperty,
    getEnumLabelSafe,
    parseBitfield,
    hasBitflag,
    formatBitfield,
    countBitflags,
    toggleBitflag,
    setBitflag,
    unsetBitflag,
} from './enums';

// ============================================================================
// Version
// ============================================================================

export const VERSION = '1.0.0';
