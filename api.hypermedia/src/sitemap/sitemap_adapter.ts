import { User, Role } from "@houseofwolves/serverlesslaunchpad.core";
import { HalResourceAdapter, HalObject } from "../content_types/hal_adapter";
import { Router } from "../router";
import { NavigationItem } from "./types";
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

    get navigation() {
        return {
            items: this.buildNavigationTree()
        };
    }

    private buildNavigationTree(): NavigationItem[] {
        const items: NavigationItem[] = [
            this.buildHomeLink(),
        ];

        // Add account menu for authenticated users
        if (this.user) {
            items.push(this.buildAccountMenu());
        }

        // Add admin menu for admin users
        if (this.user && this.hasRole(this.user, Role.Admin)) {
            items.push(this.buildAdminMenu());
        }

        return items;
    }

    private buildHomeLink(): NavigationItem {
        return {
            id: "home",
            title: "Home",
            href: "/",  // Dashboard home route
            icon: "home"
        };
    }

    private buildAccountMenu(): NavigationItem {
        // At this point, this.user is guaranteed to exist (checked by caller)
        const userId = this.user!.userId;

        return {
            id: "account",
            title: "My Account",
            icon: "user-circle",
            items: [
                {
                    id: "sessions",
                    title: "Sessions",
                    href: this.router.buildHref(SessionsController, 'getSessions', { userId }),
                    method: "POST",
                    icon: "clock"
                },
                {
                    id: "api-keys",
                    title: "API Keys",
                    href: this.router.buildHref(ApiKeysController, 'getApiKeys', { userId }),
                    method: "POST",
                    icon: "key"
                },
                {
                    id: "logout",
                    title: "Logout",
                    href: this.router.buildHref(AuthenticationController, 'revoke', {}),
                    method: "POST",
                    icon: "logout"
                }
            ]
        };
    }

    private buildAdminMenu(): NavigationItem {
        return {
            id: "admin",
            title: "Administration",
            href: "/admin",
            icon: "shield",
            requiresRole: "Admin",
            items: [
                {
                    id: "reports",
                    title: "Reports",
                    href: "/admin/reports",
                    icon: "chart"
                },
                {
                    id: "settings",
                    title: "Settings",
                    href: "/admin/settings",
                    icon: "cog"
                }
            ]
        };
    }

    private hasRole(user: User, role: Role): boolean {
        return user.role >= role;
    }

    get _links(): HalObject["_links"] {
        const links: HalObject["_links"] = {
            self: this.createLink(this.router.buildHref(SitemapController, 'getSitemap', {})),
            home: this.createLink(this.router.buildHref(RootController, 'getRoot', {}))
        };

        // Add federate link for unauthenticated users
        if (!this.user) {
            links['auth:federate'] = this.createLink(
                this.router.buildHref(AuthenticationController, 'federate', {}),
                { title: 'Federate Session' }
            );
        }

        return links;
    }

    protected getBaseLinks(): Record<string, import("../content_types/hal_adapter").HalLink> | undefined {
        return undefined;
    }

    toJSON(): HalObject {
        return {
            title: this.title,
            navigation: this.navigation,
            _links: this._links,
        };
    }
}
