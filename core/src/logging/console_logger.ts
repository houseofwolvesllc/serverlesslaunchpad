import { Logger, LogContext, LogLevel } from './logger';

/**
 * Console-based logger implementation with environment-based level filtering.
 * Outputs structured JSON logs to stdout/stderr.
 */
export class ConsoleLogger implements Logger {
    private readonly logLevel: LogLevel;

    constructor(logLevel?: LogLevel) {
        this.logLevel = logLevel ?? this.parseLogLevelFromEnv();
    }

    /**
     * Parse log level from environment variables.
     * First priority: explicit LOG_LEVEL
     * Second priority: derive from NODE_ENV
     */
    private parseLogLevelFromEnv(): LogLevel {
        // First priority: explicit LOG_LEVEL
        const logLevel = process.env.LOG_LEVEL?.toUpperCase();
        if (logLevel) {
            switch (logLevel) {
                case 'DEBUG': return LogLevel.DEBUG;
                case 'INFO': return LogLevel.INFO;
                case 'WARN': return LogLevel.WARN;
                case 'ERROR': return LogLevel.ERROR;
            }
        }
        
        // Second priority: derive from NODE_ENV
        const nodeEnv = process.env.NODE_ENV?.toLowerCase();
        switch (nodeEnv) {
            case 'development':
            case 'dev': 
                return LogLevel.DEBUG;
            case 'test':
                return LogLevel.WARN; // Reduce noise in tests
            case 'staging':
                return LogLevel.INFO;
            case 'production':
            case 'prod':
                return LogLevel.WARN; // Production should be quiet
            default:
                return LogLevel.INFO; // Safe default
        }
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