/**
 * Logger interface for structured logging across the application.
 * Provides different log levels with optional context data.
 */
export interface Logger {
    /**
     * Log debug information (verbose, development use)
     */
    debug(message: string, context?: LogContext): void;

    /**
     * Log informational messages (general operations)
     */
    info(message: string, context?: LogContext): void;

    /**
     * Log warnings (potential issues, but not errors)
     */
    warn(message: string, context?: LogContext): void;

    /**
     * Log errors (failures, exceptions)
     */
    error(message: string, context?: LogContext): void;
}

/**
 * Context data that can be included with log messages
 */
export interface LogContext {
    /**
     * Unique identifier for request correlation
     */
    traceId?: string;

    /**
     * Additional contextual data (flexible)
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
}

/**
 * Available log levels in order of severity
 */
export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}