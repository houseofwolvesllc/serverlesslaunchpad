/**
 * Web Application Logger
 *
 * Provides structured logging for the web application using the core Logger interface.
 * Log level is determined by Vite environment mode (development, staging, production).
 *
 * Usage:
 * ```typescript
 * import { logger } from './logging/logger';
 *
 * logger.debug('Component mounted', { componentName: 'Dashboard' });
 * logger.error('API request failed', { error, url });
 * ```
 */

import { ConsoleLogger, LogLevel } from '@houseofwolves/serverlesslaunchpad.core';

/**
 * Determine log level based on Vite environment mode
 */
function getLogLevelForEnvironment(): LogLevel {
    const env = import.meta.env.MODE || 'development';

    switch (env) {
        case 'moto':        // Local development with Moto AWS mocks
        case 'development': // Standard development mode
            return LogLevel.DEBUG;  // Show all logs in dev
        case 'staging':
            return LogLevel.WARN;   // Only warnings and errors in staging
        case 'production':
            return LogLevel.ERROR;  // Only errors in production
        default:
            return LogLevel.INFO;
    }
}

/**
 * Singleton logger instance for the web application.
 * Uses ConsoleLogger from core with environment-based log level.
 */
export const logger = new ConsoleLogger(getLogLevelForEnvironment());

/**
 * Re-export types for convenience
 */
export { LogLevel } from '@houseofwolves/serverlesslaunchpad.core';
export type { LogContext } from '@houseofwolves/serverlesslaunchpad.core';
