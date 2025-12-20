import { User, Role } from "@houseofwolves/serverlesslaunchpad.core";
import { HalResourceAdapter, HalObject } from "../content_types/hal_adapter";
import { Router } from "../router";
import { Navigation } from "./navigation_types";
import { AuthenticationController } from "../authentication/authentication_controller";
import { SessionsController } from "../sessions/sessions_controller";
import { ApiKeysController } from "../api_keys/api_keys_controller";
import { RootController } from "../root/root_controller";
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
     */
    get _nav(): Navigation {
        const nav: Navigation = [];

        if (!this.user) {
            // Unauthenticated users see limited navigation
            nav.push({
                title: "Public",
                items: [
                    { rel: "home", type: "link" }
                ]
            });
            return nav;
        }

        // Main navigation for authenticated users
        nav.push({
            title: "Main Navigation",
            items: [
                { rel: "home", type: "link" },
                { rel: "sessions", type: "link" },
                { rel: "api-keys", type: "link" }
            ]
        });

        // Admin section (nested group example)
        if (this.hasRole(this.user, Role.Admin)) {
            nav.push({
                title: "Administration",
                items: [
                    { rel: "admin-reports", type: "link" },
                    { rel: "admin-settings", type: "link" }
                ]
            });
        }

        // User menu
        nav.push({
            title: "User",
            items: [
                { rel: "logout", type: "template" }
            ]
        });

        return nav;
    }

    private hasRole(user: User, role: Role): boolean {
        return user.role >= role;
    }

    get _links(): HalObject["_links"] {
        const links: HalObject["_links"] = {
            self: this.createLink(this.router.buildHref(SitemapController, 'getSitemap', {})),
            home: this.createLink(this.router.buildHref(RootController, 'getRoot', {}), {
                title: "Home"
            })
        };

        // Add user-specific links for authenticated users
        if (this.user) {
            const userId = this.user.userId;

            links['sessions'] = this.createLink(
                this.router.buildHref(SessionsController, 'getSessions', { userId }),
                { title: "Sessions" }
            );

            links['api-keys'] = this.createLink(
                this.router.buildHref(ApiKeysController, 'getApiKeys', { userId }),
                { title: "API Keys" }
            );

            links['logout'] = this.createLink(
                this.router.buildHref(AuthenticationController, 'revoke', {}),
                { title: "Logout" }
            );

            // Admin links
            if (this.hasRole(this.user, Role.Admin)) {
                links['admin-reports'] = this.createLink('/admin/reports', {
                    title: "Reports"
                });

                links['admin-settings'] = this.createLink('/admin/settings', {
                    title: "Settings"
                });
            }
        } else {
            // Add federate link for unauthenticated users
            links['auth:federate'] = this.createLink(
                this.router.buildHref(AuthenticationController, 'federate', {}),
                { title: 'Federate Session' }
            );
        }

        return links;
    }

    get _templates(): HalObject["_templates"] {
        if (!this.user) {
            return undefined;
        }

        // POST operations become templates
        return {
            logout: this.createTemplate(
                "Logout",
                "POST",
                this.router.buildHref(AuthenticationController, 'revoke', {})
            )
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
            _templates: this._templates
        };
    }
}
