import { Role, User } from "@houseofwolves/serverlesslaunchpad.core";
import { ApiKeysController } from "../api_keys/api_keys_controller";
import { AuthenticationController } from "../authentication/authentication_controller";
import { HalObject, HalResourceAdapter } from "../content_types/hal_adapter";
import { RootController } from "../root/root_controller";
import { Router } from "../router";
import { SessionsController } from "../sessions/sessions_controller";
import { UsersController } from "../users/users_controller";
import { Navigation } from "./navigation_types";
import { SitemapController } from "./sitemap_controller";

/**
 * Sitemap adapter using reverse routing for navigation
 *
 * Uses Router.buildHref() to generate all URLs from route metadata,
 * ensuring the sitemap stays in sync with @Route decorators.
 */
export class SitemapAdapter extends HalResourceAdapter {
    constructor(private user: User | undefined, private router: Router) {
        super();
    }

    get title() {
        return "API Sitemap";
    }

    /**
     * Navigation structure using _nav pattern
     * References _links and _templates by key for true HATEOAS
     *
     * Returns only dynamic, permission-based navigation.
     * Static items (Home, API Documentation) are managed by the web client.
     */
    get _nav(): Navigation {
        const nav: Navigation = [];

        if (!this.user) {
            // Unauthenticated users have no dynamic navigation
            return [];
        }

        // Admin section (if user has admin role)
        if (this.hasRole(this.user, Role.Admin)) {
            nav.push({
                title: "Administration",
                items: [
                    { rel: "admin-reports", type: "link" },
                    { rel: "admin-settings", type: "link" },
                ],
            });
        }

        // My Account menu (for user button)
        nav.push({
            title: "My Account",
            items: [
                { rel: "my-profile", type: "link", title: "My Profile" },
                { rel: "sessions", type: "template", title: "Sessions" },
                { rel: "api-keys", type: "template", title: "API Keys" },
                { rel: "logout", type: "template", title: "Logout" },
            ],
        });

        return nav;
    }

    private hasRole(user: User, role: Role): boolean {
        return user.role >= role;
    }

    get _links(): HalObject["_links"] {
        const links: HalObject["_links"] = {
            self: this.createLink(this.router.buildHref(SitemapController, "getSitemap", {})),
            home: this.createLink(this.router.buildHref(RootController, "getRoot", {}), {
                title: "API Root",
            }),
        };

        // Add user-specific links for authenticated users
        if (this.user) {
            links["my-profile"] = this.createLink(
                this.router.buildHref(UsersController, "getUser", { userId: this.user.userId }),
                {
                    title: "My Profile",
                }
            );

            // Admin links
            if (this.hasRole(this.user, Role.Admin)) {
                links["admin-reports"] = this.createLink("/admin/reports", {
                    title: "Reports",
                });

                links["admin-settings"] = this.createLink("/admin/settings", {
                    title: "Settings",
                });
            }
        }

        return links;
    }

    get _templates(): HalObject["_templates"] {
        if (!this.user) {
            return undefined;
        }

        const userId = this.user.userId;

        // POST operations become templates
        return {
            sessions: this.createTemplate(
                "Sessions",
                "POST",
                this.router.buildHref(SessionsController, "getSessions", { userId }),
                {
                    contentType: "application/json",
                    properties: [
                        {
                            name: "pagingInstruction",
                            prompt: "Paging Instruction",
                            required: false,
                            type: "hidden",
                        },
                    ],
                }
            ),
            "api-keys": this.createTemplate(
                "API Keys",
                "POST",
                this.router.buildHref(ApiKeysController, "getApiKeys", { userId }),
                {
                    contentType: "application/json",
                    properties: [
                        {
                            name: "pagingInstruction",
                            prompt: "Paging Instruction",
                            required: false,
                            type: "hidden",
                        },
                    ],
                }
            ),
            logout: this.createTemplate(
                "Logout",
                "POST",
                this.router.buildHref(AuthenticationController, "revoke", {})
            ),
        };
    }

    protected getBaseLinks(): Record<string, import("../content_types/hal_adapter").HalLink> | undefined {
        return undefined;
    }

    toJSON(): HalObject {
        return {
            title: this.title,
            _nav: this._nav,
            _links: this._links,
            _templates: this._templates,
        };
    }
}
