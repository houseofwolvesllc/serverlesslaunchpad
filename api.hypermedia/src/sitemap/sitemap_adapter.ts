import { User, Role } from "@houseofwolves/serverlesslaunchpad.core";
import { HalResourceAdapter, HalObject } from "../content_types/hal_adapter";
import { NavigationItem } from "./types";

export class SitemapAdapter extends HalResourceAdapter {
    constructor(private user?: User) {
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

        // Add login for unauthenticated users, account menu for authenticated
        if (this.user) {
            items.push(this.buildDocumentationLink());
            items.push(this.buildAccountMenu());
        } else {
            items.push(this.buildLoginLink());
            items.push(this.buildDocumentationLink());
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
            href: "/",
            icon: "home"
        };
    }

    private buildLoginLink(): NavigationItem {
        return {
            id: "login",
            title: "Login",
            href: "/auth/federate",
            method: "POST",
            icon: "login"
        };
    }

    private buildDocumentationLink(): NavigationItem {
        return {
            id: "documentation",
            title: "Documentation",
            href: "/docs",
            icon: "file-text"
        };
    }

    private buildAccountMenu(): NavigationItem {
        return {
            id: "account",
            title: "My Account",
            icon: "user-circle",
            items: [
                {
                    id: "sessions",
                    title: "Sessions",
                    href: "/users/{userId}/sessions/list",
                    method: "POST",
                    templated: true,
                    icon: "clock"
                },
                {
                    id: "api-keys",
                    title: "API Keys",
                    href: "/users/{userId}/api_keys/list",
                    method: "POST",
                    templated: true,
                    icon: "key"
                },
                {
                    id: "logout",
                    title: "Logout",
                    href: "/auth/revoke",
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
        return {
            self: this.createLink("/sitemap"),
            home: this.createLink("/")
        };
    }

    protected getBaseLinks(): Record<string, import("../content_types/hal_adapter").HalLink> | undefined {
        return undefined;
    }
}
