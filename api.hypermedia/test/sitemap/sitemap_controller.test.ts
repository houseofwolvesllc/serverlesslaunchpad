import { describe, it, expect, beforeEach } from "vitest";
import { Role } from "@houseofwolves/serverlesslaunchpad.core";
import { ALBEvent } from "aws-lambda";
import { getContainer } from "../../src/container";
import { SitemapController } from "../../src/sitemap/sitemap_controller";

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
                accept: "application/json"
            },
            body: null,
            isBase64Encoded: false
        };

        if (user) {
            event.user = user;
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
        expect(body.navigation.items.length).toBe(3);
        expect(body.navigation.items.find((i: any) => i.id === "admin")).toBeDefined();
    });

    it("should return filtered sitemap for regular user", async () => {
        const user = createMockUser({ role: Role.User });
        const event = createEvent(user);

        const result = await controller.getSitemap(event);

        expect(result.statusCode).toBe(200);

        const body = JSON.parse(result.body);
        expect(body.navigation.items.length).toBe(2);
        expect(body.navigation.items.find((i: any) => i.id === "admin")).toBeUndefined();
    });

    it("should return public sitemap for unauthenticated request", async () => {
        const event = createEvent();

        const result = await controller.getSitemap(event);

        expect(result.statusCode).toBe(200);

        const body = JSON.parse(result.body);
        expect(body.navigation.items.length).toBe(1);
        expect(body.navigation.items[0].id).toBe("authentication");
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
});
