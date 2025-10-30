import { Features, Role, User } from "@houseofwolves/serverlesslaunchpad.core";
import { ZodError, z } from "zod";
import { ALBResult } from "aws-lambda";
import {
    ConflictError,
    ForbiddenError,
    HttpError,
    InternalServerError,
    NotFoundError,
    UnauthorizedError,
    UnprocessableEntityError,
    ValidationError
} from "./errors";
import { AuthenticatedALBEvent, ExtendedALBEvent } from "./extended_alb_event";
import { getAcceptedContentType, CONTENT_TYPES } from "./content_types/content_negotiation";
import { HalJsonAdapter } from "./content_types/hal_json_adapter";
import { HalXhtmlAdapter } from "./content_types/hal_xhtml_adapter";

/**
 * Response data interface for content adapters
 *
 * This interface structures the response for content type adapters (JSON, XHTML).
 * For hypermedia responses, use HAL resource adapters which implement the HalObject interface.
 *
 * @see https://stateless.group/hal_specification.html
 */
export interface ResponseData<T = unknown> {
    /** HTTP status code */
    status?: number;

    /** Response data - can be plain object or HalObject from adapter */
    data?: T;

    /** Error information for error responses */
    error?: {
        status: number;
        title: string;
        detail?: string;
        instance?: string;
        timestamp?: string;
        traceId?: string;
        violations?: Array<{ field: string; message: string }>;
    };
}

/**
 * Base controller class that provides common functionality
 * for all API controllers.
 */
export abstract class BaseController {
    // HAL adapters for all responses (api.hypermedia always returns HAL)
    private static jsonAdapter = new HalJsonAdapter();
    private static xhtmlAdapter = new HalXhtmlAdapter();

    // Export error classes as static properties for easy access
    static readonly ValidationError = ValidationError;
    static readonly UnauthorizedError = UnauthorizedError;
    static readonly ForbiddenError = ForbiddenError;
    static readonly NotFoundError = NotFoundError;
    static readonly ConflictError = ConflictError;
    static readonly UnprocessableEntityError = UnprocessableEntityError;
    static readonly InternalServerError = InternalServerError;

    /**
     * Helper method to build error responses.
     * Controllers can throw these errors and they'll be handled
     * by the global error handler.
     */
    protected throwError(error: HttpError): never {
        throw error;
    }

    /**
     * Helper to throw validation errors from Zod results.
     * Extracts field-level errors for better error messages.
     */
    protected throwValidationError(zodError: ZodError, message?: string): never {
        throw new ValidationError(
            message || "Request validation failed",
            zodError
        );
    }

    /**
     * Helper to check if a user has a specific role.
     * Implements role hierarchy: Admin > AccountManager > Support > Base
     */
    protected hasRole(userRole: Role, requiredRole: Role): boolean {
        return userRole >= requiredRole;
    }

    /**
     * Helper to check if a user has specific features.
     * Features are checked using bitwise operations.
     */
    protected hasFeatures(userFeatures: Features, requiredFeatures: Features): boolean {
        return (userFeatures & requiredFeatures) === requiredFeatures;
    }

    /**
     * Helper to check if the current user is the owner of a resource.
     * Useful for implementing "allowOwner" logic in controllers.
     */
    protected isResourceOwner(user: User, resourceUserId: string): boolean {
        return user.userId === resourceUserId;
    }

    /**
     * Helper to get human-readable role name
     */
    protected getRoleName(role: Role): string {
        return Role[role];
    }

    /**
     * Helper to get list of feature names from bitmask
     */
    protected getFeatureNames(features: Features): string[] {
        const names: string[] = [];
        
        if (features & Features.Contacts) names.push('Contacts');
        if (features & Features.Campaigns) names.push('Campaigns');
        if (features & Features.Links) names.push('Links');
        if (features & Features.Apps) names.push('Apps');
        
        return names;
    }

    /**
     * Build a successful ALB response with content negotiation
     *
     * In api.hypermedia, all responses are HAL objects with hypermedia controls.
     * The appropriate HAL adapter is selected based on the client's Accept header.
     *
     * @param event - The ALB event
     * @param data - The response data (HAL object from an adapter)
     * @param options - Additional options for status code and headers
     */
    protected success<T>(
        event: ExtendedALBEvent,
        data: T,
        options: {
            status?: number;
            headers?: Record<string, string>;
        } = {}
    ): ALBResult {
        const contentType = getAcceptedContentType(event);
        const status = options.status || 200;

        const responseData: ResponseData = {
            status,
            data
        };

        // Format response using appropriate HAL adapter for content type
        const body = (contentType === CONTENT_TYPES.XHTML || contentType === CONTENT_TYPES.HTML)
            ? BaseController.xhtmlAdapter.format(responseData)
            : BaseController.jsonAdapter.format(responseData);

        return {
            statusCode: status,
            headers: {
                "Content-Type": contentType,
                ...options.headers
            },
            body
        };
    }

    /**
     * Build a redirect ALB response
     */
    protected redirect(
        location: string,
        options: {
            status?: 301 | 302 | 303 | 307 | 308;
            headers?: Record<string, string>;
        } = {}
    ): ALBResult {
        return {
            statusCode: options.status || 302,
            headers: {
                Location: location,
                ...options.headers
            },
            body: ""
        };
    }

    /**
     * Helper method to parse request data from ALB event.
     * Parses path parameters, query parameters, and body.
     * Validates against the provided Zod schema.
     */
    protected parseRequest<T extends z.ZodSchema>(
        event: ExtendedALBEvent, 
        schema: T
    ): z.infer<T> {
        // Parse body if present
        let body = {};
        if (event.body) {
            try {
                body = JSON.parse(event.body);
            } catch {
                // If not JSON, treat as plain text
                body = { body: event.body };
            }
        }

        // Build request object
        const request = {
            params: event.pathParameters || {},
            query: event.queryStringParameters || {},
            body,
            headers: event.headers || {}
        };

        // Validate against schema
        const result = schema.safeParse(request);
        if (!result.success) {
            this.throwValidationError(result.error);
        }

        return result.data;
    }

    /**
     * Helper to extract just the path parameters from ALB event
     */
    protected getPathParams(event: ExtendedALBEvent): Record<string, string> {
        return event.pathParameters || {};
    }

    /**
     * Helper to extract the trace ID from ALB event
     */
    protected getTraceId(event: ExtendedALBEvent): string {
        return event.traceId || 'unknown';
    }

    /**
     * Get the authentication type from the event.
     */
    protected getAuthType(event: AuthenticatedALBEvent): 'apiKey' | 'session' | 'unknown' {
        return event.authContext.access.type;
    }

    /**
     * Check if the current request is using session authentication.
     */
    protected isSessionAuth(event: AuthenticatedALBEvent): boolean {
        return event.authContext.access.type === 'session';
    }

    /**
     * Require that the user has a specific role.
     * Throws ForbiddenError if the user doesn't have the required role.
     */
    protected requireRole(user: User, requiredRole: Role, options?: {
        allowOwner?: boolean;
        resourceUserId?: string;
    }): void {
        const hasRequiredRole = this.hasRole(user.role, requiredRole);
        
        if (options?.allowOwner && options.resourceUserId) {
            const isOwner = this.isResourceOwner(user, options.resourceUserId);
            if (hasRequiredRole || isOwner) {
                return; // Access granted
            }
            throw new ForbiddenError(
                `This action requires ${this.getRoleName(requiredRole)} role or resource ownership`
            );
        }
        
        if (!hasRequiredRole) {
            throw new ForbiddenError(
                `This action requires ${this.getRoleName(requiredRole)} role or higher`
            );
        }
    }

    /**
     * Require that the user has specific features.
     * Throws ForbiddenError if the user doesn't have the required features.
     */
    protected requireFeatures(user: User, requiredFeatures: Features): void {
        if (!this.hasFeatures(user.features, requiredFeatures)) {
            const userFeatureNames = this.getFeatureNames(user.features);
            const requiredFeatureNames = this.getFeatureNames(requiredFeatures);
            const missing = requiredFeatureNames.filter(f => !userFeatureNames.includes(f));
            
            throw new ForbiddenError(
                `This action requires features: ${missing.join(', ')}`
            );
        }
    }

    /**
     * Require that the authentication is via session (not API key).
     * Useful for sensitive operations.
     */
    protected requireSessionAuth(event: AuthenticatedALBEvent): void {
        if (!this.isSessionAuth(event)) {
            throw new ForbiddenError("This action requires session authentication");
        }
    }

}