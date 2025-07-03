import { Logger, LogContext, LogLevel } from './logger';

/**
 * Console-based logger implementation with configurable level filtering.
 * Outputs structured JSON logs to stdout/stderr.
 */
export class ConsoleLogger implements Logger {
    private readonly logLevel: LogLevel;

    constructor(logLevel: LogLevel = LogLevel.INFO) {
        this.logLevel = logLevel;
    }

    /**
     * Check if a log level should be emitted based on current log level
     */
    private shouldLog(level: LogLevel): boolean {
        return level >= this.logLevel;
    }

    /**
     * Format log entry as structured JSON
     */
    private formatLogEntry(level: string, message: string, context?: LogContext): string {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            ...context
        };

        return JSON.stringify(logEntry);
    }

    debug(message: string, context?: LogContext): void {
        if (this.shouldLog(LogLevel.DEBUG)) {
            console.log(this.formatLogEntry('DEBUG', message, context));
        }
    }

    info(message: string, context?: LogContext): void {
        if (this.shouldLog(LogLevel.INFO)) {
            console.log(this.formatLogEntry('INFO', message, context));
        }
    }

    warn(message: string, context?: LogContext): void {
        if (this.shouldLog(LogLevel.WARN)) {
            console.warn(this.formatLogEntry('WARN', message, context));
        }
    }

    error(message: string, context?: LogContext): void {
        if (this.shouldLog(LogLevel.ERROR)) {
            console.error(this.formatLogEntry('ERROR', message, context));
        }
    }
}