import { ApiLogger } from "../logging";
import { ExtendedALBEvent } from "../extended_alb_event";
import { getContainer } from "../container";

/**
 * Log decorator that provides structured logging for API methods.
 * Logs request start and completion with HTTP context, timing, and status.
 * 
 * Uses the IoC container to resolve the Logger service.
 * 
 * Logs:
 * - Request start (debug level)
 * - Successful completion (info level) with timing and status code
 * - Errors (error level) with full error context and timing
 * - HTTP context (method, path, traceId, etc.)
 * 
 * Example:
 * @Log()
 * @Protected()
 * async getUser(event: AuthenticatedALBEvent) { ... }
 */
export function Log() {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const className = target.constructor.name;
        const methodName = propertyKey;
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            // Get the container instance and resolve logger
            const container = getContainer();
            const logger = container.resolve(ApiLogger);

            // Extract the ALB event (first argument by convention)
            const event = args[0] as ExtendedALBEvent;
            const startTime = Date.now();

            // Context for all logs
            const methodContext = {
                class: className,
                method: methodName
            };

            // Log request start
            logger.logRequestStart(
                `Starting ${className}.${methodName}`,
                event,
                methodContext
            );

            try {
                // Execute the method
                const result = await originalMethod.apply(this, args);
                
                // Log successful completion
                const duration = Date.now() - startTime;
                const statusCode = result?.statusCode || 200;
                
                logger.logRequestSuccess(
                    `Completed ${className}.${methodName}`,
                    event,
                    statusCode,
                    duration,
                    methodContext
                );

                return result;
            } catch (error: any) {
                // Log error
                const duration = Date.now() - startTime;
                
                logger.logRequestError(
                    `Failed ${className}.${methodName}`,
                    event,
                    error,
                    duration,
                    methodContext
                );

                // Re-throw the error
                throw error;
            }
        };

        return descriptor;
    };
}

/**
 * Legacy Debug decorator - kept for backward compatibility
 * @deprecated Use @Log() instead
 */
export const Debug = Log;