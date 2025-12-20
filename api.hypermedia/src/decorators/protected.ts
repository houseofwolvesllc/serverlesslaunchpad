import { Authenticator } from "@houseofwolves/serverlesslaunchpad.core";
import { z } from "zod";
import { AuthenticationCookieRepository } from "../authentication/authentication_cookie_repository";
import { getContainer } from "../container";
import { UnauthorizedError, ValidationError } from "../errors";
import { ExtendedALBEvent } from "../extended_alb_event";

// Schema for validating protected endpoint requirements (Authorization header now optional)
const ProtectedEventSchema = z
    .object({
        headers: z.object({
            Authorization: z.string().optional(),
            "x-forwarded-for": z.string(),
            "user-agent": z.string(),
        }),
    })
    .superRefine((data, ctx) => {
        const authHeader = data.headers.Authorization;

        // If Authorization header is present, validate it
        if (authHeader && !authHeader.startsWith("SessionToken ") && !authHeader.startsWith("ApiKey ")) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Authorization header must start with 'SessionToken ' or 'ApiKey '",
                path: ["headers", "Authorization"],
            });
        }
    });

/**
 * Options for the @Protected decorator
 */
interface ProtectedOptions {
    /**
     * Allow anonymous (unauthenticated) requests.
     * When true, requests without credentials will continue without authContext.
     * Requests with invalid credentials will still throw UnauthorizedError.
     */
    allowAnonymous?: boolean;
}

/**
 * Protected decorator that validates credentials (API key or session token).
 * Uses the IoC container to resolve the Authenticator service for authentication.
 * Enriches the event with user context and authentication type information.
 *
 * This decorator ONLY handles authentication. Authorization checks should be
 * done explicitly in the controller methods where you have full context.
 *
 * @param options - Configuration options
 * @param options.allowAnonymous - If true, allows requests without credentials (authContext will be undefined)
 *
 * Example (required auth):
 * @Protected()
 * async getUser(event: AuthenticatedALBEvent) {
 *     const user = event.authContext.identity;
 *     // Do authorization checks here with full context
 * }
 *
 * Example (optional auth):
 * @Protected({ allowAnonymous: true })
 * async getSitemap(event: ExtendedALBEvent) {
 *     const user = event.authContext?.identity; // May be undefined
 *     // Adapt response based on whether user is authenticated
 * }
 */
export function Protected(options: ProtectedOptions = {}) {
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
            let authType: string | undefined;
            let token: string | undefined;

            // Try Authorization header first
            if (headers.Authorization) {
                [authType, token] = headers.Authorization.split(" ") || ["unknown", undefined];
            } else {
                // Fall back to cookie for browser-based navigation
                const cookieToken = AuthenticationCookieRepository.get(event as any);
                if (cookieToken) {
                    authType = "SessionToken";
                    token = cookieToken;
                } else if (!options.allowAnonymous) {
                    // No token and anonymous not allowed - throw
                    throw new UnauthorizedError("Authentication required - no token found in header or cookie");
                }
                // If no token and allowAnonymous: true, continue without authContext
            }

            // If we have a token, verify it
            if (token) {
                const verifyResult = await authenticator.verify({
                    apiKey: authType === "ApiKey" ? token : undefined,
                    sessionToken: authType === "SessionToken" ? token : undefined,
                    ipAddress: headers["x-forwarded-for"],
                    userAgent: headers["user-agent"],
                });

                if (!verifyResult?.authContext?.identity) {
                    if (!options.allowAnonymous) {
                        throw new UnauthorizedError("Invalid authentication credentials");
                    }

                    AuthenticationCookieRepository.remove(event as any);
                } else {
                    // Valid token - inject into event
                    event.authContext = verifyResult.authContext;
                }
            }

            // Call the original method with the enriched event
            return originalMethod.apply(this, args);
        };

        return descriptor;
    };
}
