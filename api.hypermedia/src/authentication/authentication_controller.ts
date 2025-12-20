import { Authenticator, Injectable, User } from "@houseofwolves/serverlesslaunchpad.core";
import { ALBResult } from "aws-lambda";
import { BaseController } from "../base_controller";
import { UnauthorizedError } from "../errors";
import { ExtendedALBEvent } from "../extended_alb_event";
import { Route } from "../router";
import { AuthenticationCookieRepository } from "./authentication_cookie_repository";
import { AuthenticateSchema, SignoutSchema, VerifySchema } from "./schemas";

// type AuthMessage = z.infer<typeof AuthMessageSchema>;

/**
 * Controller handling authentication endpoints.
 * Uses the IoC container to inject dependencies.
 */
@Injectable()
export class AuthenticationController extends BaseController {
    constructor(private authenticator: Authenticator) {
        super();
    }

    /**
     * Authenticate a user with a JWT token.
     * Returns hypermedia response with available actions based on user's permissions.
     */
    @Route("POST", "/auth/federate")
    async federate(event: ExtendedALBEvent): Promise<ALBResult> {
        console.log("FEDERATE");
        console.log("AUTHENTICATOR", this.authenticator);

        const { headers, body } = this.parseRequest(event, AuthenticateSchema);

        const authMessage = {
            accessToken: headers.authorization.replace("Bearer ", ""),
            ipAddress: headers["x-forwarded-for"],
            userAgent: headers["user-agent"],
            sessionKey: body.sessionKey,
            email: body.email,
            firstName: body.firstName,
            lastName: body.lastName,
        };

        // Use Authority to authorize and get the authenticated user
        const authResult = await this.authenticator.authenticate(authMessage);

        if (!authResult.authContext.identity) {
            throw new UnauthorizedError("Bearer failed validation.");
        }

        // Create response
        const response = this.success(event, {
            user: authResult.authContext.identity,
            authContext: authResult.authContext,
            links: this.buildUserLinks(authResult.authContext.identity),
        });

        // Set secure cookie if client accepts HTML for hypermedia browsing
        if (this.shouldSetAuthCookie(event)) {
            AuthenticationCookieRepository.set(
                response,
                authResult.authContext.access.sessionToken || "",
                authResult.authContext.access.dateExpires
                    ? Math.floor(authResult.authContext.access.dateExpires.getTime() / 1000)
                    : 60 * 60 * 24 * 7
            );
        }

        return response;
    }

    @Route("POST", "/auth/verify")
    async verify(event: ExtendedALBEvent): Promise<ALBResult> {
        const { headers } = this.parseRequest(event, VerifySchema);

        let sessionToken: string;

        // Check authorization header for SessionToken
        if (headers.authorization) {
            if (!headers.authorization.startsWith("SessionToken ")) {
                throw new UnauthorizedError("Only SessionToken authentication is supported for verify");
            }
            sessionToken = headers.authorization.replace("SessionToken ", "");
        } else {
            // Fall back to cookie
            const cookieToken = AuthenticationCookieRepository.get(event);
            if (!cookieToken) {
                throw new UnauthorizedError("No valid session found");
            }
            sessionToken = cookieToken;
        }

        const verifyResult = await this.authenticator.verify({
            sessionToken,
            ipAddress: headers["x-forwarded-for"],
            userAgent: headers["user-agent"],
        });

        if (!verifyResult.authContext.identity) {
            throw new UnauthorizedError("Session verification failed");
        }

        // Create response with user info and hypermedia links
        const response = this.success(
            event,
            {
                authenticated: true,
                user: verifyResult.authContext.identity,
                authContext: {
                    type: verifyResult.authContext.access.type,
                    expiresAt: verifyResult.authContext.access.dateExpires,
                },
                links: this.buildUserLinks(verifyResult.authContext.identity),
            },
            {
                metadata: {
                    title: "Authentication Verification",
                    description: "Current session status and user information",
                    resourceType: "SessionStatus",
                },
            }
        );

        // Refresh cookie if using cookie authentication and client accepts HTML
        if (!headers.authorization && this.shouldSetAuthCookie(event)) {
            AuthenticationCookieRepository.set(
                response,
                sessionToken,
                verifyResult.authContext.access.dateExpires
                    ? Math.floor((verifyResult.authContext.access.dateExpires.getTime() - Date.now()) / 1000)
                    : 60 * 60 * 24 * 7
            );
        }

        return response;
    }

    /**
     * Build hypermedia links based on user's permissions.
     */
    private buildUserLinks(user: User): Array<{ rel: string[]; href: string }> {
        const links = [
            {
                rel: ["self"],
                href: `/users/${user.userId}`,
            },
        ];

        // Add session management links
        links.push({
            rel: ["sessions"],
            href: `/users/${user.userId}/sessions/`,
        });

        // Add API key management links
        links.push({
            rel: ["api-keys"],
            href: `/users/${user.userId}/api_keys/`,
        });

        return links;
    }

    @Route("POST", "/auth/revoke")
    async revoke(event: ExtendedALBEvent): Promise<ALBResult> {
        const { headers } = this.parseRequest(event, SignoutSchema);

        await this.authenticator.revoke({
            sessionToken: headers.authorization.replace("SessionToken ", ""),
            ipAddress: headers["x-forwarded-for"],
            userAgent: headers["user-agent"],
        });

        // Create response
        const response = this.success(event, {});

        // Clear the session cookie
        AuthenticationCookieRepository.remove(response);

        return response;
    }

    /**
     * Determine if we should set authentication cookie for this request
     */
    private shouldSetAuthCookie(event: ExtendedALBEvent): boolean {
        const accept = event.headers?.accept || event.headers?.Accept || "";
        // Set cookie if client accepts HTML (for hypermedia browsing)
        return accept.includes("text/html") || accept.includes("application/xhtml+xml");
    }
}
