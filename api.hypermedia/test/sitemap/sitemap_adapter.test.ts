import { describe, it, expect } from "vitest";
import { Role } from "@houseofwolves/serverlesslaunchpad.core";
import { SitemapAdapter } from "../../src/sitemap/sitemap_adapter";

describe("SitemapAdapter", () => {
    const createMockUser = (options: { role: Role }) => ({
        userId: "user-123",
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
        role: options.role,
        features: 0,
        dateCreated: new Date(),
        dateModified: new Date()
    });

    it("should build navigation tree for admin user", () => {
        const user = createMockUser({ role: Role.Admin });
        const adapter = new SitemapAdapter(user);

        const nav = adapter.navigation;

        // Admin sees: home, documentation, account, admin
        expect(nav.items).toHaveLength(4);
        expect(nav.items.find(i => i.id === "home")).toBeDefined();
        expect(nav.items.find(i => i.id === "documentation")).toBeDefined();
        expect(nav.items.find(i => i.id === "account")).toBeDefined();
        expect(nav.items.find(i => i.id === "admin")).toBeDefined();
    });

    it("should exclude admin menu for regular users", () => {
        const user = createMockUser({ role: Role.User });
        const adapter = new SitemapAdapter(user);

        const nav = adapter.navigation;

        // Regular user sees: home, documentation, account (no admin)
        expect(nav.items).toHaveLength(3);
        expect(nav.items.find(i => i.id === "home")).toBeDefined();
        expect(nav.items.find(i => i.id === "documentation")).toBeDefined();
        expect(nav.items.find(i => i.id === "account")).toBeDefined();
        expect(nav.items.find(i => i.id === "admin")).toBeUndefined();
    });

    it("should build minimal navigation for unauthenticated users", () => {
        const adapter = new SitemapAdapter(undefined);

        const nav = adapter.navigation;

        // Unauthenticated sees: home, login, documentation
        expect(nav.items).toHaveLength(3);
        expect(nav.items.find(i => i.id === "home")).toBeDefined();
        expect(nav.items.find(i => i.id === "login")).toBeDefined();
        expect(nav.items.find(i => i.id === "documentation")).toBeDefined();
    });

    it("should create structure with nested items under account", () => {
        const user = createMockUser({ role: Role.User });
        const adapter = new SitemapAdapter(user);

        const accountMenu = adapter.navigation.items.find(i => i.id === "account");

        expect(accountMenu?.items).toBeDefined();
        expect(accountMenu?.items?.length).toBe(3); // sessions, api-keys, logout
        expect(accountMenu?.items?.find(i => i.id === "sessions")).toBeDefined();
        expect(accountMenu?.items?.find(i => i.id === "api-keys")).toBeDefined();
        expect(accountMenu?.items?.find(i => i.id === "logout")).toBeDefined();
    });

    it("should serialize to valid HAL JSON", () => {
        const adapter = new SitemapAdapter();
        const json = JSON.parse(JSON.stringify(adapter));

        expect(json._links.self.href).toBe("/sitemap");
        expect(json._links.home.href).toBe("/");
        expect(json.navigation.items).toBeDefined();
        expect(json.title).toBe("API Sitemap");
    });

    it("should not include base links (overrides getBaseLinks)", () => {
        const adapter = new SitemapAdapter();
        const json = JSON.parse(JSON.stringify(adapter));

        // Sitemap should NOT have sitemap link to itself
        expect(json._links.sitemap).toBeUndefined();
        // Only has self and home
        expect(Object.keys(json._links).sort()).toEqual(["home", "self"]);
    });

    it("should include logout in account menu for authenticated users", () => {
        const user = createMockUser({ role: Role.User });
        const adapter = new SitemapAdapter(user);

        const accountMenu = adapter.navigation.items.find(i => i.id === "account");
        const logoutItem = accountMenu?.items?.find(i => i.id === "logout");

        expect(logoutItem).toBeDefined();
        expect(logoutItem?.href).toBe("/auth/revoke");
    });

    it("should mark templated URIs correctly", () => {
        const user = createMockUser({ role: Role.User });
        const adapter = new SitemapAdapter(user);

        const accountMenu = adapter.navigation.items.find(i => i.id === "account");
        const sessionsItem = accountMenu?.items?.find(i => i.id === "sessions");

        expect(sessionsItem?.templated).toBe(true);
        expect(sessionsItem?.href).toContain("{userId}");
    });
});
