import { Authenticator, Injectable } from "@houseofwolves/serverlesslaunchpad.core";
import { ALBResult } from "aws-lambda";
import { BaseController } from "../base_controller";
import { MessageAdapter } from "../content_types/message_adapter";
import { UnauthorizedError } from "../errors";
import { ExtendedALBEvent } from "../extended_alb_event";
import { Route, Router } from "../router";
import { AuthContext, AuthContextAdapter } from "./auth_context_adapter";
import { AuthenticationCookieRepository } from "./authentication_cookie_repository";
import { AuthenticateSchema, SignoutSchema, VerifySchema } from "./schemas";

// type AuthMessage = z.infer<typeof AuthMessageSchema>;

/**
 * Controller handling authentication endpoints.
 * Uses the IoC container to inject dependencies.
 */
@Injectable()
export class AuthenticationController extends BaseController {
    constructor(private authenticator: Authenticator, private router: Router) {
        super();
    }

    /**
     * Authenticate a user with a JWT token.
     * Returns HAL-compliant hypermedia response with user as main resource.
     */
    @Route("POST", "/auth/federate")
    async federate(event: ExtendedALBEvent): Promise<ALBResult> {
        const { headers, body } = this.parseRequest(event, AuthenticateSchema);

        const authMessage = {
            accessToken: headers.authorization.replace("Bearer ", ""),
            ipAddress: headers["x-forwarded-for"],
            userAgent: headers["user-agent"],
            sessionKey: body.sessionKey,
            email: body.email,
            firstName: body.firstName || "",
            lastName: body.lastName || "",
        };

        const authResult = await this.authenticator.authenticate(authMessage);

        console.log("authResult", authResult);

        if (!authResult.authContext.identity) {
            throw new UnauthorizedError("Bearer failed validation.");
        }

        // Use HAL adapter to structure the response
        // Safe to assert - we've verified identity exists above
        const hal = new AuthContextAdapter(authResult.authContext as AuthContext);

        // Create response (adapter instance IS the HAL object)
        const response = this.success(event, hal);

        // Set secure cookie if client accepts HTML for hypermedia browsing
        if (this.shouldSetAuthCookie(event)) {
            // Construct sessionToken from sessionKey + userId for cookie storage
            const sessionToken = body.sessionKey ? body.sessionKey + authResult.authContext.identity!.userId : "";

            AuthenticationCookieRepository.set(
                response,
                sessionToken,
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

        const hal = new AuthContextAdapter(verifyResult.authContext as AuthContext);

        const response = this.success(event, hal);

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

    @Route("POST", "/auth/revoke")
    async revoke(event: ExtendedALBEvent): Promise<ALBResult> {
        const { headers } = this.parseRequest(event, SignoutSchema);

        // Get session token from either Authorization header or cookie
        let sessionToken: string;
        if (headers.authorization && headers.authorization.startsWith("SessionToken ")) {
            sessionToken = headers.authorization.replace("SessionToken ", "");
        } else {
            // Fall back to cookie
            const cookieToken = AuthenticationCookieRepository.get(event);
            if (!cookieToken) {
                throw new UnauthorizedError("No valid session found");
            }
            sessionToken = cookieToken;
        }

        await this.authenticator.revoke({
            sessionToken,
            ipAddress: headers["x-forwarded-for"],
            userAgent: headers["user-agent"],
        });

        // Action response - no self link, provide navigation to federate
        const adapter = new MessageAdapter({
            message: "Session revoked successfully",
            links: {
                federate: {
                    href: this.router.buildHref(AuthenticationController, 'federate', {}),
                    title: "Federate Session"
                },
            },
        });

        const response = this.success(event, adapter);

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
        return (
            accept.includes("text/html") ||
            accept.includes("application/xhtml+xml") ||
            accept.includes("application/json")
        );
    }
}
