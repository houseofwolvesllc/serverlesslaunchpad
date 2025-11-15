import { Injectable, Role } from "@houseofwolves/serverlesslaunchpad.core";
import { ALBResult } from "aws-lambda";
import { BaseController } from "../base_controller";
import { Protected } from "../decorators/protected";
import { ExtendedALBEvent } from "../extended_alb_event";
import { Route, Router } from "../router";
import { SessionsController } from "../sessions/sessions_controller";
import { ApiKeysController } from "../api_keys/api_keys_controller";
import { AuthenticationController } from "../authentication/authentication_controller";
import { UsersController } from "../users/users_controller";

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
        }
    >;
    _templates?: Record<string, any>;
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

        // Always include sitemap link
        response._links["sitemap"] = {
            href: "/sitemap",
            title: "API Navigation",
        };

        // Base templates available to all users (authenticated and unauthenticated)
        response._templates = {
            "federate": {
                title: "Federate Identity Provider Token",
                method: "POST",
                target: this.router.buildHref(AuthenticationController, 'federate', {}),
                contentType: "application/json",
                properties: [
                    {
                        name: "idToken",
                        prompt: "ID Token",
                        required: true,
                        type: "textarea"
                    }
                ]
            },
            "verify": {
                title: "Verify Session",
                method: "POST",
                target: this.router.buildHref(AuthenticationController, 'verify', {}),
                contentType: "application/json",
                properties: []
            }
        };

        // Add authenticated-only templates
        if (isAuthenticated && userId) {
            response._templates["revoke"] = {
                title: "Revoke Session",
                method: "POST",
                target: this.router.buildHref(AuthenticationController, 'revoke', {}),
                contentType: "application/json",
                properties: []
            };
            response._templates["sessions"] = {
                title: "Sessions",
                method: "POST",
                target: this.router.buildHref(SessionsController, 'getSessions', { userId }),
                contentType: "application/json",
                properties: [
                    {
                        name: "pagingInstruction",
                        prompt: "Paging Instruction",
                        required: false,
                        type: "hidden"
                    }
                ]
            };
            response._templates["api-keys"] = {
                title: "API Keys",
                method: "POST",
                target: this.router.buildHref(ApiKeysController, 'getApiKeys', { userId }),
                contentType: "application/json",
                properties: [
                    {
                        name: "pagingInstruction",
                        prompt: "Paging Instruction",
                        required: false,
                        type: "hidden"
                    }
                ]
            };

            // Admin-only templates
            const user = event.authContext?.identity;
            if (user && user.role >= Role.Admin) {
                response._templates["users"] = {
                    title: "Users",
                    method: "POST",
                    target: this.router.buildHref(UsersController, 'getUsers', {}),
                    contentType: "application/json",
                    properties: [
                        {
                            name: "pagingInstruction",
                            prompt: "Paging Instruction",
                            required: false,
                            type: "hidden"
                        }
                    ]
                };
            }
        }

        return this.success(event, response);
    }
}
