import { describe, it, expect, beforeEach, vi } from "vitest";
import { Role } from "@houseofwolves/serverlesslaunchpad.core";
import { SitemapAdapter } from "../../src/sitemap/sitemap_adapter";
import { Router } from "../../src/router";

describe("SitemapAdapter", () => {
    let mockRouter: Router;

    beforeEach(() => {
        // Create mock router with buildHref method
        mockRouter = {
            buildHref: vi.fn((controller: any, method: string, params: any) => {
                // Simple mock implementation
                if (method === 'getSitemap') return '/sitemap';
                if (method === 'getRoot') return '/';
                if (method === 'getSessions') return `/users/${params.userId}/sessions/list`;
                if (method === 'getApiKeys') return `/users/${params.userId}/api-keys/list`;
                if (method === 'revoke') return '/auth/revoke';
                return '/mock-url';
            })
        } as any;
    });

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
        const adapter = new SitemapAdapter(user, mockRouter);

        const nav = adapter._nav;

        // Admin sees: Admin group + My Account group
        expect(nav).toHaveLength(2);
        expect(nav[0]).toMatchObject({ title: "Admin" });
        expect(nav[1]).toMatchObject({ title: "My Account" });
    });

    it("should exclude admin menu for regular users", () => {
        const user = createMockUser({ role: Role.User });
        const adapter = new SitemapAdapter(user, mockRouter);

        const nav = adapter._nav;

        // Regular user sees: My Account group (no Administration)
        expect(nav).toHaveLength(1);
        expect(nav[0]).toMatchObject({ title: "My Account" });
    });

    it("should build minimal navigation for unauthenticated users", () => {
        const adapter = new SitemapAdapter(undefined, mockRouter);

        const nav = adapter._nav;

        // Unauthenticated sees: Empty array (web client handles static items)
        expect(nav).toHaveLength(0);
    });

    it("should create structure with sessions and api-keys as templates", () => {
        const user = createMockUser({ role: Role.User });
        const adapter = new SitemapAdapter(user, mockRouter);

        const myAccountGroup = adapter._nav.find(item => 'title' in item && item.title === "My Account");

        expect(myAccountGroup).toBeDefined();
        expect(myAccountGroup).toHaveProperty('items');
        const items = (myAccountGroup as any).items;
        expect(items).toHaveLength(4); // my-profile, sessions, api-keys, logout
        expect(items[0]).toEqual({ rel: "my-profile", type: "link", title: "My Profile" });
        expect(items[1]).toEqual({ rel: "sessions", type: "template", title: "Sessions" });
        expect(items[2]).toEqual({ rel: "api-keys", type: "template", title: "API Keys" });
        expect(items[3]).toEqual({ rel: "logout", type: "template", title: "Logout" });
    });

    it("should serialize to valid HAL JSON", () => {
        const adapter = new SitemapAdapter(undefined, mockRouter);
        const json = adapter.toJSON();

        expect(json._links.self.href).toBe("/sitemap");
        expect(json._links.home.href).toBe("/");
        expect(json._nav).toBeDefined();
        expect(json.title).toBe("API Sitemap");
    });

    it("should not include base links (overrides getBaseLinks)", () => {
        const adapter = new SitemapAdapter(undefined, mockRouter);
        const json = adapter.toJSON();

        // Sitemap should NOT have sitemap link to itself
        expect(json._links.sitemap).toBeUndefined();
        // Only has self and home for unauthenticated
        expect(Object.keys(json._links).sort()).toEqual(["home", "self"]);
    });

    it("should include logout in user menu for authenticated users", () => {
        const user = createMockUser({ role: Role.User });
        const adapter = new SitemapAdapter(user, mockRouter);

        const myAccountGroup = adapter._nav.find(item => 'title' in item && item.title === "My Account");

        expect(myAccountGroup).toBeDefined();
        expect(myAccountGroup).toHaveProperty('items');
        const items = (myAccountGroup as any).items;
        expect(items[3]).toEqual({ rel: "logout", type: "template", title: "Logout" });
    });

    it("should include sessions and api-keys in templates", () => {
        const user = createMockUser({ role: Role.User });
        const adapter = new SitemapAdapter(user, mockRouter);

        const templates = adapter._templates;

        expect(templates).toBeDefined();
        expect(templates?.sessions).toBeDefined();
        expect(templates?.sessions.title).toBe("Sessions");
        expect(templates?.sessions.method).toBe("POST");
        expect(templates?.sessions.target).toBe("/users/user-123/sessions/list");

        expect(templates?.["api-keys"]).toBeDefined();
        expect(templates?.["api-keys"].title).toBe("API Keys");
        expect(templates?.["api-keys"].method).toBe("POST");
        expect(templates?.["api-keys"].target).toBe("/users/user-123/api-keys/list");
    });

    it("should include logout in templates for authenticated users", () => {
        const user = createMockUser({ role: Role.User });
        const adapter = new SitemapAdapter(user, mockRouter);

        const templates = adapter._templates;

        expect(templates?.logout).toBeDefined();
        expect(templates?.logout.title).toBe("Logout");
        expect(templates?.logout.method).toBe("POST");
        expect(templates?.logout.target).toBe("/auth/revoke");
    });

    it("should not include templates for unauthenticated users", () => {
        const adapter = new SitemapAdapter(undefined, mockRouter);

        const templates = adapter._templates;

        expect(templates).toBeUndefined();
    });
});
