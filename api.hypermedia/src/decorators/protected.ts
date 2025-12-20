import { Authenticator } from "@houseofwolves/serverlesslaunchpad.core";
import { z } from "zod";
import { UnauthorizedError, ValidationError } from "../common/errors";
import { ExtendedALBEvent } from "../common/extended_alb_event";
import { getContainer } from "../container";
import { AuthenticationCookieRepository } from "../authentication/authentication_cookie_repository";

// Schema for validating protected endpoint requirements (Authorization header now optional)
const ProtectedEventSchema = z.object({
    headers: z.object({
        'Authorization': z.string().optional(),
        'x-forwarded-for': z.string(),
        'user-agent': z.string()
    })
}).superRefine((data, ctx) => {
    const authHeader = data.headers.Authorization;
    
    // If Authorization header is present, validate it
    if (authHeader && !authHeader.startsWith('SessionToken ') && !authHeader.startsWith('ApiKey ')) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Authorization header must start with 'SessionToken ' or 'ApiKey '",
            path: ['headers', 'Authorization']
        });
    }
});

/**
 * Protected decorator that validates credentials (API key or session token).
 * Uses the IoC container to resolve the Authenticator service for authentication.
 * Enriches the event with user context and authentication type information.
 * 
 * This decorator ONLY handles authentication. Authorization checks should be
 * done explicitly in the controller methods where you have full context.
 * 
 * Example:
 * @Protected()
 * async getUser(event: ALBEvent) {
 *     const user = this.getAuthenticatedUser(event);
 *     // Do authorization checks here with full context
 * }
 */
export function Protected() {
    return function (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            // Get the container instance (same singleton used everywhere)
            const container = getContainer();
            
            // Resolve the Authenticator service from the container
            const authenticator = container.resolve(Authenticator);

            // Extract the ALB event (first argument by convention)
            const event = args[0] as ExtendedALBEvent;
            
            // Validate the event structure and authentication requirements
            const validation = ProtectedEventSchema.safeParse(event);
            
            if (!validation.success) {
                throw new ValidationError("Invalid authentication headers", validation.error);
            }

            const headers = validation.data.headers;
            let authType: string;
            let token: string | undefined;

            // Try Authorization header first
            if (headers.Authorization) {
                [authType, token] = headers.Authorization.split(' ') || ["unknown", undefined];
            } else {
                // Fall back to cookie for browser-based navigation
                const cookieToken = AuthenticationCookieRepository.get(event as any);
                if (cookieToken) {
                    authType = "SessionToken";
                    token = cookieToken;
                } else {
                    throw new UnauthorizedError("Authentication required - no token found in header or cookie");
                }
            }

            const verifyResult = await authenticator.verify({
                apiKey: (authType === "ApiKey") ? token : undefined,
                sessionToken: (authType === "SessionToken") ? token : undefined,
                ipAddress: headers['x-forwarded-for'],
                userAgent: headers['user-agent']
            });

            if (!verifyResult.authContext.identity) {
                throw new UnauthorizedError("Authentication required");
            }

            // Inject the authenticated user and auth context into the event
            event.authContext = verifyResult.authContext;

            // Call the original method with the enriched event
            return originalMethod.apply(this, args);
        };

        return descriptor;
    };
}

