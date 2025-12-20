import { ConsoleLogger, LogContext, LogLevel } from "@houseofwolves/serverlesslaunchpad.core";
import { ExtendedALBEvent } from '../common/extended_alb_event';

/**
 * API-specific logger that automatically extracts HTTP context from ALB events.
 * Extends ConsoleLogger with HTTP-specific logging methods and context extraction.
 */
export class ApiLogger extends ConsoleLogger {
    constructor(logLevel?: LogLevel) {
        super(logLevel);
    }

    /**
     * Extract HTTP context from ALB event for logging
     */
    private extractHttpContext(event: ExtendedALBEvent): LogContext {
        return {
            traceId: event.traceId || event.headers?.['x-amzn-trace-id'] || 'unknown',
            httpMethod: event.httpMethod,
            path: event.path,
            userAgent: event.headers?.['user-agent'],
            ipAddress: event.headers?.['x-forwarded-for']
        };
    }

    /**
     * Log a request start event
     */
    logRequestStart(message: string, event: ExtendedALBEvent, context?: LogContext): void {
        const httpContext = this.extractHttpContext(event);
        const combinedContext = { ...httpContext, ...context };
        this.debug(message, combinedContext);
    }

    /**
     * Log a successful request completion
     */
    logRequestSuccess(message: string, event: ExtendedALBEvent, statusCode: number, duration: number, context?: LogContext): void {
        const httpContext = this.extractHttpContext(event);
        const combinedContext = { 
            ...httpContext, 
            statusCode, 
            duration, 
            success: true, 
            ...context 
        };
        this.info(message, combinedContext);
    }

    /**
     * Log a failed request
     */
    logRequestError(message: string, event: ExtendedALBEvent, error: Error, duration: number, context?: LogContext): void {
        const httpContext = this.extractHttpContext(event);
        const combinedContext = { 
            ...httpContext, 
            duration, 
            success: false,
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack
            },
            ...context 
        };
        this.error(message, combinedContext);
    }

    /**
     * Log with automatic HTTP context extraction (convenience method)
     */
    logWithHttpContext(level: 'debug' | 'info' | 'warn' | 'error', message: string, event: ExtendedALBEvent, context?: LogContext): void {
        const httpContext = this.extractHttpContext(event);
        const combinedContext = { ...httpContext, ...context };
        this[level](message, combinedContext);
    }
}