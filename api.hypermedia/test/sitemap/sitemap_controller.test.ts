import { describe, it, expect, beforeEach } from "vitest";
import { Role } from "@houseofwolves/serverlesslaunchpad.core";
import { ALBEvent } from "aws-lambda";
import { getContainer } from "../../src/container";
import { SitemapController } from "../../src/sitemap/sitemap_controller";
import "../../src/index.js"; // Register Router in container

describe("SitemapController", () => {
    let controller: SitemapController;

    beforeEach(() => {
        const container = getContainer();
        controller = container.resolve(SitemapController);
    });

    const createEvent = (user?: any): ALBEvent => {
        const event: any = {
            requestContext: {
                elb: {
                    targetGroupArn: "test-arn"
                }
            },
            httpMethod: "GET",
            path: "/sitemap",
            queryStringParameters: null,
            headers: {
                accept: "application/json",
                "x-forwarded-for": "127.0.0.1",
                "user-agent": "test-agent"
            },
            body: null,
            isBase64Encoded: false
        };

        // Set authContext if user is provided (simulates @Protected decorator)
        if (user) {
            event.authContext = {
                identity: user,
                access: {
                    type: "session",
                    ipAddress: "127.0.0.1",
                    userAgent: "test-agent"
                }
            };
        }

        return event;
    };

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

    it("should return sitemap for authenticated admin", async () => {
        const user = createMockUser({ role: Role.Admin });
        const event = createEvent(user);

        const result = await controller.getSitemap(event);

        expect(result.statusCode).toBe(200);

        const body = JSON.parse(result.body);
        // Admin sees: Main Navigation + Administration + User
        expect(body._nav.length).toBe(3);
        expect(body._nav[0].title).toBe("Main Navigation");
        expect(body._nav[1].title).toBe("Administration");
        expect(body._nav[2].title).toBe("User");
    });

    it("should return filtered sitemap for regular user", async () => {
        const user = createMockUser({ role: Role.User });
        const event = createEvent(user);

        const result = await controller.getSitemap(event);

        expect(result.statusCode).toBe(200);

        const body = JSON.parse(result.body);
        // Regular user sees: Main Navigation + User (no Administration)
        expect(body._nav.length).toBe(2);
        expect(body._nav[0].title).toBe("Main Navigation");
        expect(body._nav[1].title).toBe("User");
    });

    it("should return public sitemap for unauthenticated request", async () => {
        const event = createEvent();

        const result = await controller.getSitemap(event);

        expect(result.statusCode).toBe(200);

        const body = JSON.parse(result.body);
        // Unauthenticated sees: Public navigation only
        expect(body._nav.length).toBe(1);
        expect(body._nav[0].title).toBe("Public");
        expect(body._nav[0].items[0].rel).toBe("home");
    });

    it("should include proper HAL links", async () => {
        const event = createEvent();

        const result = await controller.getSitemap(event);

        expect(result.statusCode).toBe(200);

        const body = JSON.parse(result.body);
        expect(body._links.self.href).toBe("/sitemap");
        expect(body._links.home.href).toBe("/");
    });

    it("should not include sitemap link to itself", async () => {
        const event = createEvent();

        const result = await controller.getSitemap(event);

        expect(result.statusCode).toBe(200);

        const body = JSON.parse(result.body);
        expect(body._links.sitemap).toBeUndefined();
    });

    it("should return correct content type", async () => {
        const event = createEvent();

        const result = await controller.getSitemap(event);

        expect(result.statusCode).toBe(200);
        expect(result.headers?.["Content-Type"]).toBe("application/json");
    });

    it("should include sessions and api-keys as templates for authenticated users", async () => {
        const user = createMockUser({ role: Role.User });
        const event = createEvent(user);

        const result = await controller.getSitemap(event);

        expect(result.statusCode).toBe(200);

        const body = JSON.parse(result.body);

        // Should have templates
        expect(body._templates).toBeDefined();
        expect(body._templates.sessions).toBeDefined();
        expect(body._templates["api-keys"]).toBeDefined();
        expect(body._templates.logout).toBeDefined();

        // Templates should be POST operations
        expect(body._templates.sessions.method).toBe("POST");
        expect(body._templates["api-keys"].method).toBe("POST");
        expect(body._templates.logout.method).toBe("POST");
    });

    it("should not include templates for unauthenticated users", async () => {
        const event = createEvent();

        const result = await controller.getSitemap(event);

        expect(result.statusCode).toBe(200);

        const body = JSON.parse(result.body);

        // No templates for unauthenticated users
        expect(body._templates).toBeUndefined();
    });

    it("should mark sessions and api-keys as templates in navigation", async () => {
        const user = createMockUser({ role: Role.User });
        const event = createEvent(user);

        const result = await controller.getSitemap(event);

        expect(result.statusCode).toBe(200);

        const body = JSON.parse(result.body);

        const mainNav = body._nav.find((group: any) => group.title === "Main Navigation");
        expect(mainNav).toBeDefined();

        const sessionsItem = mainNav.items.find((item: any) => item.rel === "sessions");
        const apiKeysItem = mainNav.items.find((item: any) => item.rel === "api-keys");

        expect(sessionsItem.type).toBe("template");
        expect(apiKeysItem.type).toBe("template");
    });
});
