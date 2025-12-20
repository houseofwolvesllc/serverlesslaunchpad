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
import { parseRequestBody } from "./content_types/body_parser";
import { ExtendedALBEvent } from "./extended_alb_event";
import { ApiLogger } from "./logging";
import { HttpMethod, Router } from "./router";
import { InfrastructureConfigurationStore } from "@houseofwolves/serverlesslaunchpad.framework";

// Import controllers for route registration
import { ApiKeysController } from "./api_keys/api_keys_controller";
import { AuthenticationController } from "./authentication/authentication_controller";
import { AuthenticationCookieRepository } from "./authentication/authentication_cookie_repository";
import { RootController } from "./root/root_controller";
import { SessionsController } from "./sessions/sessions_controller";
import { SitemapController } from "./sitemap/sitemap_controller";
import { UsersController } from "./users/users_controller";

const container = getContainer();
const router = new Router();

// Register all application routes
router.registerRoutes([
    RootController,
    AuthenticationController,
    SessionsController,
    ApiKeysController,
    SitemapController,
    UsersController
]);

// Register router as singleton in container so it can be injected into controllers
try {
    container.bind(Router).toFactory(() => router).asSingleton();
} catch (error: any) {
    // Router already registered (e.g., from test setup) - that's fine
    if (!error.message?.includes('already registered')) {
        throw error;
    }
}

// Initialize cookie repository with domain from config for cross-subdomain sharing
// This promise must be awaited before processing requests to avoid race conditions
let cookieInitPromise: Promise<void> | null = null;

async function ensureCookieDomainInitialized(): Promise<void> {
    if (!cookieInitPromise) {
        cookieInitPromise = (async () => {
            try {
                const configStore = container.resolve(InfrastructureConfigurationStore);
                const config = await configStore.get();
                const cookieDomain = config.cors?.cookie_domain;

                if (!cookieDomain) {
                    console.warn('[COOKIE] cookie_domain not configured - cookies will only work for same-host requests');
                }

                AuthenticationCookieRepository.initialize(cookieDomain);
            } catch (error) {
                console.error('[COOKIE] Failed to load cookie domain config - cross-subdomain auth will fail:', error);
                // Initialize with undefined - cookies will be same-host only
                AuthenticationCookieRepository.initialize(undefined);
            }
        })();
    }
    return cookieInitPromise;
}

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

    // Ensure cookie domain is initialized before processing requests
    // This prevents a race condition where cookies are set without the domain
    await ensureCookieDomainInitialized();

    // Handle OPTIONS preflight requests
    if (event.httpMethod === "OPTIONS") {
        const corsHeaders = await getCorsHeaders(event);
        return {
            statusCode: 204,
            headers: {
                ...getSecurityHeaders(),
                ...corsHeaders,
            },
            body: "",
        };
    }

    try {
        // Parse request body to check for method override (_method field)
        const extendedEvent = event as ExtendedALBEvent;
        extendedEvent.traceId = traceId;
        const parsedBody = parseRequestBody(extendedEvent);

        // Match the route using actual HTTP method (POST for method overrides)
        // Method override is handled after routing by updating extendedEvent.httpMethod
        const routeMatch = router.match(event.httpMethod as HttpMethod, event.path);
        if (!routeMatch) {
            throw new NotFoundError(`Route not found: ${event.httpMethod} ${event.path}`);
        }

        // Resolve the controller from the container
        // Controllers are concrete classes, so they can be resolved without explicit binding
        const controller = container.resolve(routeMatch.route.controllerClass);

        // Inject route parameters and override HTTP method if needed
        extendedEvent.pathParameters = routeMatch.parameters;

        // Override httpMethod in event if _method was present
        if (parsedBody.method) {
            extendedEvent.httpMethod = parsedBody.method.toUpperCase();
        }

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

        // Add CORS headers to successful response
        const corsHeaders = await getCorsHeaders(event);
        return {
            ...response,
            headers: {
                ...response.headers,
                ...corsHeaders,
            },
        };
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
        return await handleError(error as Error, event, traceId);
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

// Cached CORS configuration
let corsConfig: { allowed_origin_suffix?: string } | undefined;
let corsEnvironment: string | undefined;

/**
 * Get CORS headers based on the request origin and configuration.
 * - moto environment: allows all origins (returns "*")
 * - other environments: allows origins matching the configured suffix (e.g., ".serverlesslaunchpad.com")
 */
async function getCorsHeaders(event: ALBEvent): Promise<Record<string, string>> {
    const origin = event.headers?.origin || event.headers?.Origin;

    // Load config once and cache it
    if (corsConfig === undefined) {
        try {
            const configStore = container.resolve(InfrastructureConfigurationStore);
            const config = await configStore.get();
            corsConfig = config.cors || {};
            corsEnvironment = config.environment;
        } catch {
            corsConfig = {};
        }
    }

    // Moto: allow any origin; AWS environments: use suffix matching
    const suffix = corsConfig.allowed_origin_suffix;
    const isAllowed = corsEnvironment === "moto" || (suffix && origin?.endsWith(suffix));

    return {
        "Access-Control-Allow-Origin": isAllowed ? origin || "" : "",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, Cookie, Cache-Control",
        "Access-Control-Allow-Credentials": "true",
    };
}

/**
 * Handle errors and generate appropriate responses with comprehensive error mapping
 */
async function handleError(error: Error, event: ALBEvent, traceId?: string): Promise<ALBResult> {
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
    };

    // Format response based on content type
    const body =
        acceptedContentType === CONTENT_TYPES.JSON
            ? jsonAdapter.format(responseData)
            : xhtmlAdapter.format(responseData);

    // Get CORS headers for error responses
    const corsHeaders = await getCorsHeaders(event);

    const response: ALBResult = {
        statusCode: status,
        headers: {
            "Content-Type": acceptedContentType,
            ...getSecurityHeaders(),
            ...corsHeaders,
        },
        body,
    };

    // Clear session cookie on 401 errors if a session cookie was present
    // This prevents invalid/expired cookies from causing redirect loops
    if (status === 401 && AuthenticationCookieRepository.get(event)) {
        AuthenticationCookieRepository.remove(response);
    }

    return response;
}
