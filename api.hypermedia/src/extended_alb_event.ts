import { ALBEvent } from "aws-lambda";
import { User, AuthenticateResult } from "@houseofwolves/serverlesslaunchpad.core";

/**
 * Extended ALB Event with additional properties injected by middleware/decorators.
 * This provides type safety for the enhanced event object used throughout the application.
 */
export interface ExtendedALBEvent extends ALBEvent {
    /**
     * Path parameters extracted from the route (e.g., {userId} from /users/{userId})
     */
    pathParameters?: Record<string, string>;
    
    /**
     * Unique trace ID for request tracking and logging
     */
    traceId?: string;
    
    /**
     * Authentication context injected by @Protected decorator
     * Contains the authenticated user and access details
     */
    authContext?: AuthenticateResult["authContext"];
}

/**
 * Type guard to check if an ALB event has been extended with authentication context
 */
export function hasAuthContext(event: ALBEvent): event is ExtendedALBEvent & { authContext: NonNullable<ExtendedALBEvent["authContext"]> } {
    return (event as ExtendedALBEvent).authContext !== undefined;
}

/**
 * Type guard to check if an ALB event has path parameters
 */
export function hasPathParameters(event: ALBEvent): event is ExtendedALBEvent & { pathParameters: NonNullable<ExtendedALBEvent["pathParameters"]> } {
    return (event as ExtendedALBEvent).pathParameters !== undefined;
}

/**
 * Helper type for events that are guaranteed to have authentication context with a valid user.
 * This type reflects the runtime guarantee provided by the @Protected decorator.
 */
export type AuthenticatedALBEvent = ExtendedALBEvent & {
    authContext: NonNullable<ExtendedALBEvent["authContext"]> & {
        identity: User; // @Protected decorator guarantees identity is present
    };
};

/**
 * Type guard to verify an event has authenticated user context
 */
export function isAuthenticated(event: ExtendedALBEvent): event is AuthenticatedALBEvent {
    return event.authContext?.identity !== undefined;
}