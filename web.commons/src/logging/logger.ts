/**
 * Web Application Logger
 *
 * Framework-agnostic logger for web applications using the core Logger interface.
 * Log level can be configured based on environment.
 *
 * Usage:
 * ```typescript
 * import { createWebLogger, LogLevel } from '@houseofwolves/serverlesslaunchpad.web.commons/logging';
 *
 * const logger = createWebLogger(LogLevel.DEBUG);
 * logger.debug('Component mounted', { componentName: 'Dashboard' });
 * logger.error('API request failed', { error, url });
 * ```
 */

import { ConsoleLogger, LogLevel } from '@houseofwolves/serverlesslaunchpad.core';

/**
 * Environment to log level mapping
 */
export const LOG_LEVEL_MAP: Record<string, LogLevel> = {
    'moto': LogLevel.DEBUG,        // Local development with Moto AWS mocks
    'development': LogLevel.DEBUG,  // Standard development mode
    'staging': LogLevel.WARN,       // Only warnings and errors in staging
    'production': LogLevel.ERROR,   // Only errors in production
};

/**
 * Determine log level based on environment
 *
 * @param environment - Environment name (e.g., 'development', 'production')
 * @returns Appropriate log level for the environment
 */
export function getLogLevelForEnvironment(environment: string): LogLevel {
    return LOG_LEVEL_MAP[environment] || LogLevel.INFO;
}

/**
 * Create a logger instance for web applications
 *
 * @param logLevel - Log level to use (optional, defaults to INFO)
 * @returns ConsoleLogger instance
 *
 * @example
 * ```typescript
 * // Create logger with specific level
 * const logger = createWebLogger(LogLevel.DEBUG);
 *
 * // Create logger based on environment
 * const environment = 'development';
 * const logger = createWebLogger(getLogLevelForEnvironment(environment));
 * ```
 */
export function createWebLogger(logLevel: LogLevel = LogLevel.INFO): ConsoleLogger {
    return new ConsoleLogger(logLevel);
}

/**
 * Re-export types and classes for convenience
 */
export { LogLevel, ConsoleLogger } from '@houseofwolves/serverlesslaunchpad.core';
export type { Logger, LogContext } from '@houseofwolves/serverlesslaunchpad.core';
