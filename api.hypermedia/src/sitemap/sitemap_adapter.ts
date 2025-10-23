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
            this.buildAuthMenu(),
        ];

        // Add user management menu for authenticated users
        if (this.user) {
            items.push(this.buildUsersMenu());
        }

        // Conditionally add admin menu based on role
        if (this.user && this.hasRole(this.user, Role.Admin)) {
            items.push(this.buildAdminMenu());
        }

        return items;
    }

    private buildAuthMenu(): NavigationItem {
        const items: NavigationItem[] = [
            {
                id: "federate",
                title: "Login",
                href: "/auth/federate",
                method: "POST",
                description: "Authenticate with JWT token"
            }
        ];

        // Add verify and revoke for authenticated users
        if (this.user) {
            items.push(
                {
                    id: "verify",
                    title: "Verify Session",
                    href: "/auth/verify",
                    method: "POST"
                },
                {
                    id: "revoke",
                    title: "Logout",
                    href: "/auth/revoke",
                    method: "POST"
                }
            );
        }

        return {
            id: "authentication",
            title: "Authentication",
            icon: "lock",
            items
        };
    }

    private buildUsersMenu(): NavigationItem {
        return {
            id: "users",
            title: "User Management",
            href: "/users",
            icon: "users",
            items: [
                {
                    id: "sessions",
                    title: "Sessions",
                    href: "/users/{userId}/sessions/",
                    templated: true,
                    description: "Manage user sessions",
                    items: [
                        {
                            id: "list-sessions",
                            title: "List Sessions",
                            href: "/users/{userId}/sessions/",
                            method: "GET",
                            templated: true
                        },
                        {
                            id: "delete-sessions",
                            title: "Delete Sessions",
                            href: "/users/{userId}/sessions/delete",
                            method: "POST",
                            templated: true
                        }
                    ]
                },
                {
                    id: "api-keys",
                    title: "API Keys",
                    href: "/users/{userId}/api_keys/",
                    templated: true,
                    description: "Manage API keys",
                    items: [
                        {
                            id: "list-api-keys",
                            title: "List API Keys",
                            href: "/users/{userId}/api_keys/",
                            method: "GET",
                            templated: true
                        },
                        {
                            id: "delete-api-keys",
                            title: "Delete API Keys",
                            href: "/users/{userId}/api_keys/delete",
                            method: "POST",
                            templated: true
                        }
                    ]
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
