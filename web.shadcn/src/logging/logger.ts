/**
 * Logger - Vite Wrapper
 *
 * This file provides a Vite-specific wrapper around the logging utilities
 * from web.commons. It creates a logger configured for the Vite environment.
 */

import { createWebLogger, getLogLevelForEnvironment } from '@houseofwolves/serverlesslaunchpad.web.commons';

/**
 * Get environment from Vite
 */
const environment = import.meta.env.MODE || 'development';

/**
 * Create logger with environment-based log level
 */
export const logger = createWebLogger(getLogLevelForEnvironment(environment));

/**
 * Re-export types and utilities from web.commons
 */
export { LogLevel, getLogLevelForEnvironment } from '@houseofwolves/serverlesslaunchpad.web.commons';
export type { Logger, LogContext } from '@houseofwolves/serverlesslaunchpad.web.commons';
