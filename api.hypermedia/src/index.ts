import { ALBEvent, ALBResult } from "aws-lambda";
import "reflect-metadata"; // Must be imported first for decorators to work
import { ResponseData } from "./base_controller";
import { getContainer } from "./container";
import { CONTENT_TYPES, getAcceptedContentType } from "./content_types/content_negotiation";
import { JsonAdapter } from "./content_types/json_adapter";
import { XhtmlAdapter } from "./content_types/xhtml_adapter";
import {
    ConflictError,
    ForbiddenError,
    InternalServerError,
    NotFoundError,
    UnauthorizedError,
    UnprocessableEntityError,
    ValidationError,
} from "./errors";
import { ExtendedALBEvent } from "./extended_alb_event";
import { ApiLogger } from "./logging";
import { HttpMethod, Router } from "./router";

// Import controllers
import { ApiKeysController } from "./api_keys/api_keys_controller";
import { AuthenticationController } from "./authentication/authentication_controller";
import { RootController } from "./root_controller";
import { SessionsController } from "./sessions/sessions_controller";

const container = getContainer();
const router = new Router();

// Register all controllers
router.registerRoutes([RootController, AuthenticationController, SessionsController, ApiKeysController]);

/**
 * Main ALB handler for the Hypermedia API.
 * This handler implements the complete request/response flow:
 * 1. Parse ALB event and extract request data
 * 2. Match route using router
 * 3. Resolve controller from IoC container
 * 4. Build request object (URL params > Query params > Body params)
 * 5. Execute controller method
 * 6. Format response using content negotiation
 * 7. Handle all errors with proper HTTP status codes and content types
 */
export const handler = async (event: ALBEvent): Promise<ALBResult> => {
    const startTime = Date.now();
    const traceId = generateTraceId();

    const logger = container.resolve(ApiLogger);

    try {
        // Match the route
        const routeMatch = router.match(event.httpMethod as HttpMethod, event.path);
        if (!routeMatch) {
            throw new NotFoundError(`Route not found: ${event.httpMethod} ${event.path}`);
        }

        // Resolve the controller from the container
        // Controllers are concrete classes, so they can be resolved without explicit binding
        const controller = container.resolve(routeMatch.route.controllerClass);

        // Inject route parameters into the event for controller access
        // This avoids the controller having to re-parse the path
        const extendedEvent = event as ExtendedALBEvent;
        extendedEvent.pathParameters = routeMatch.parameters;
        extendedEvent.traceId = traceId;

        // Invoke the controller method
        const controllerMethod = controller[routeMatch.route.methodName];
        if (typeof controllerMethod !== "function") {
            throw new InternalServerError(
                `Method ${routeMatch.route.methodName} not found on controller ${routeMatch.route.controllerClass.name}`
            );
        }

        // Pass the extended ALB event directly to the controller
        // Controllers are responsible for their own validation
        const response = await controllerMethod.call(controller, extendedEvent);

        // Log minimal info on success (just status and duration for monitoring)
        const totalDuration = Date.now() - startTime;

        logger.logRequestSuccess("Request completed successfully", extendedEvent, response.statusCode, totalDuration);

        return response;
    } catch (error) {
        const totalDuration = Date.now() - startTime;
        const extendedEvent = event as ExtendedALBEvent;
        extendedEvent.traceId = traceId;

        // Log full request details on error for debugging
        logger.logRequestError(
            "Request failed with error",
            extendedEvent,
            error as Error,
            totalDuration,
            { fullEvent: event } // Include full event for replay-ability
        );

        // Global error handling with content-type aware responses
        return handleError(error as Error, event, traceId);
    }
};

/**
 * Generate a unique trace ID for request tracking
 */
function generateTraceId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get standard security headers for all responses
 */
function getSecurityHeaders(): Record<string, string> {
    return {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Content-Security-Policy":
            "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; object-src 'none'; frame-ancestors 'none';",
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
    };
}

/**
 * Handle errors and generate appropriate responses with comprehensive error mapping
 */
function handleError(error: Error, event: ALBEvent, traceId?: string): ALBResult {
    const acceptedContentType = getAcceptedContentType(event);
    const jsonAdapter = new JsonAdapter();
    const xhtmlAdapter = new XhtmlAdapter();

    let status: number;
    let title: string;
    let detail: string;
    let violations: Array<{ field: string; message: string }> | undefined;

    // Map error types to HTTP status codes using switch for clarity
    switch (error.constructor) {
        case ValidationError:
            status = 400;
            title = "Bad Request";
            detail = error.message || "The request failed validation";
            // Extract Zod field violations with detailed feedback
            const validationError = error as ValidationError;
            if (validationError.zodError) {
                violations = validationError.zodError.issues.map((issue) => ({
                    field: issue.path.join("."), // Flatten nested paths like "user.sessions.0.id"
                    message: issue.message,
                }));
            }
            break;

        case UnauthorizedError:
            status = 401;
            title = "Unauthorized";
            detail = error.message || "Authentication required";
            break;

        case ForbiddenError:
            status = 403;
            title = "Forbidden";
            detail = error.message || "Access denied";
            break;

        case NotFoundError:
            status = 404;
            title = "Not Found";
            detail = error.message || "Resource not found";
            break;

        case ConflictError:
            status = 409;
            title = "Conflict";
            detail = error.message || "Resource conflict";
            break;

        case UnprocessableEntityError:
            status = 422;
            title = "Unprocessable Entity";
            detail = error.message || "Business rule violation";
            break;

        case InternalServerError:
            status = 500;
            title = "Internal Server Error";
            detail = error.message || "An unexpected error occurred";
            // Already logged in catch block - no duplicate logging
            break;

        default:
            // For any unexpected errors, return 500 without exposing internal details
            status = 500;
            title = "Internal Server Error";
            detail = "An unexpected error occurred";
        // Already logged in catch block - no duplicate logging
    }

    // Build error response data
    const responseData: ResponseData = {
        status,
        error: {
            status,
            title,
            detail,
            instance: event.path,
            timestamp: new Date().toISOString(),
            traceId: traceId || generateTraceId(),
            violations,
        },
        links: [
            { rel: ["home"], href: "/" },
            { rel: ["help"], href: "/docs" },
        ],
    };

    // Format response based on content type
    const body =
        acceptedContentType === CONTENT_TYPES.JSON
            ? jsonAdapter.format(responseData)
            : xhtmlAdapter.format(responseData);

    return {
        statusCode: status,
        headers: {
            "Content-Type": acceptedContentType,
            ...getSecurityHeaders(),
        },
        body,
    };
}
