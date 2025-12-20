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

        expect(nav.items).toHaveLength(3);
        expect(nav.items[0].id).toBe("authentication");
        expect(nav.items[1].id).toBe("users");
        expect(nav.items[2].id).toBe("admin");
    });

    it("should exclude admin menu for regular users", () => {
        const user = createMockUser({ role: Role.User });
        const adapter = new SitemapAdapter(user);

        const nav = adapter.navigation;

        expect(nav.items).toHaveLength(2);
        expect(nav.items.find(i => i.id === "admin")).toBeUndefined();
    });

    it("should build minimal navigation for unauthenticated users", () => {
        const adapter = new SitemapAdapter(undefined);

        const nav = adapter.navigation;

        expect(nav.items).toHaveLength(1);
        expect(nav.items[0].id).toBe("authentication");
        expect(nav.items[0].items?.length).toBe(1);
        expect(nav.items[0].items?.[0].id).toBe("federate");
    });

    it("should create recursive structure with nested items", () => {
        const user = createMockUser({ role: Role.User });
        const adapter = new SitemapAdapter(user);

        const usersMenu = adapter.navigation.items.find(i => i.id === "users");

        expect(usersMenu?.items).toBeDefined();
        expect(usersMenu?.items?.length).toBeGreaterThan(0);

        const sessionsItem = usersMenu?.items?.find(i => i.id === "sessions");
        expect(sessionsItem?.items).toBeDefined();
        expect(sessionsItem?.items?.length).toBeGreaterThan(0);
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

    it("should include auth actions for authenticated users", () => {
        const user = createMockUser({ role: Role.User });
        const adapter = new SitemapAdapter(user);

        const authMenu = adapter.navigation.items.find(i => i.id === "authentication");
        const authItems = authMenu?.items || [];

        expect(authItems.find(i => i.id === "federate")).toBeDefined();
        expect(authItems.find(i => i.id === "verify")).toBeDefined();
        expect(authItems.find(i => i.id === "revoke")).toBeDefined();
    });

    it("should mark templated URIs correctly", () => {
        const user = createMockUser({ role: Role.User });
        const adapter = new SitemapAdapter(user);

        const usersMenu = adapter.navigation.items.find(i => i.id === "users");
        const sessionsItem = usersMenu?.items?.find(i => i.id === "sessions");

        expect(sessionsItem?.templated).toBe(true);
        expect(sessionsItem?.href).toContain("{userId}");
    });
});
