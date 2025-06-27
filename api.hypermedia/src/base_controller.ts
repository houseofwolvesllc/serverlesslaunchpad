import { Role, Features, User } from "@houseofwolves/serverlesslaunchpad.core";
import { ZodError, z } from "zod";
import { ALBEvent } from "aws-lambda";
import { ExtendedALBEvent, AuthenticatedALBEvent } from "./common/extended_alb_event";
import { 
    HttpError,
    ValidationError,
    UnauthorizedError,
    ForbiddenError,
    NotFoundError,
    ConflictError,
    UnprocessableEntityError,
    InternalServerError
} from "./common/errors";

/**
 * Base controller class that provides common functionality
 * for all API controllers.
 */
export abstract class BaseController {
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
     * Build a success response with optional data
     */
    protected success<T>(data?: T, statusCode = 200): { statusCode: number; data?: T } {
        return {
            statusCode,
            ...(data !== undefined && { data })
        };
    }

    /**
     * Build a no content response (204)
     */
    protected noContent(): { statusCode: number } {
        return { statusCode: 204 };
    }

    /**
     * Build a created response (201) with optional location header
     */
    protected created<T>(data?: T, location?: string): { statusCode: number; data?: T; headers?: Record<string, string> } {
        return {
            statusCode: 201,
            ...(data !== undefined && { data }),
            ...(location && { headers: { Location: location } })
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
    protected requireSessionAuth(event: ALBEvent): void {
        if (!this.isSessionAuth(event)) {
            throw new ForbiddenError("This action requires session authentication");
        }
    }
}