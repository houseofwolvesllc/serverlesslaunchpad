import { Injectable } from "@houseofwolves/serverlesslaunchpad.core";
import { ALBResult } from "aws-lambda";
import { BaseController } from "../base_controller";
import { Protected } from "../decorators/protected";
import { ExtendedALBEvent } from "../extended_alb_event";
import { Route, Router } from "../router";
import { SessionsController } from "../sessions/sessions_controller";
import { ApiKeysController } from "../api_keys/api_keys_controller";
import { AuthenticationController } from "../authentication/authentication_controller";

/**
 * Root API Response Structure
 *
 * Returns HAL-formatted response with available capabilities based on authentication state
 */
interface RootResponse {
    version: string;
    environment: string;
    authenticated: boolean;
    _links: Record<
        string,
        {
            href: string;
            title?: string;
            templated?: boolean;
            method?: string;
        }
    >;
}

/**
 * Root Controller
 *
 * Provides the API entry point for capability discovery.
 * Returns different sets of links based on whether the user is authenticated.
 *
 * This enables HATEOAS by allowing clients to discover available operations
 * dynamically rather than hardcoding endpoint URLs.
 */
@Injectable()
export class RootController extends BaseController {
    constructor(private router: Router) {
        super();
    }

    @Route("GET", "/")
    @Protected({ allowAnonymous: true })
    async getRoot(event: ExtendedALBEvent): Promise<ALBResult> {
        const isAuthenticated = !!event.authContext?.identity;
        const userId = event.authContext?.identity?.userId;

        const response: RootResponse = {
            version: "1.0.0",
            environment: process.env.ENVIRONMENT || "development",
            authenticated: isAuthenticated,
            _links: {
                self: {
                    href: "/",
                    title: "API Root",
                },
            },
        };

        // Unauthenticated links - available to all users
        if (!isAuthenticated) {
            response._links["auth:federate"] = {
                href: this.router.buildHref(AuthenticationController, 'federate', {}),
                title: "Federate Identity Provider Token",
                method: "POST",
            };
            response._links["sitemap"] = {
                href: "/sitemap",
                title: "API Navigation",
            };
        }

        // Authenticated links - only available after sign-in
        if (isAuthenticated && userId) {
            response._links["auth:verify"] = {
                href: this.router.buildHref(AuthenticationController, 'verify', {}),
                title: "Verify Session",
                method: "POST",
            };
            response._links["auth:revoke"] = {
                href: this.router.buildHref(AuthenticationController, 'revoke', {}),
                title: "Revoke Session",
                method: "POST",
            };
            response._links["sessions"] = {
                href: this.router.buildHref(SessionsController, 'getSessions', { userId }),
                title: "User Sessions",
                method: "POST"
            };
            response._links["api-keys"] = {
                href: this.router.buildHref(ApiKeysController, 'getApiKeys', { userId }),
                title: "User API Keys",
                method: "POST"
            };
            response._links["sitemap"] = {
                href: "/sitemap",
                title: "API Navigation",
            };
        }

        return this.success(event, response);
    }
}
