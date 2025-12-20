import type { ALBEvent } from "aws-lambda";
import { describe, expect, it } from "vitest";
import { handler } from "../src/index.js";

describe("ALB Handler", () => {
    it("should return root capabilities for unauthenticated request", async () => {
        const mockEvent: ALBEvent = {
            requestContext: {
                elb: {
                    targetGroupArn:
                        "arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/my-target-group/1234567890123456",
                },
            },
            httpMethod: "GET",
            path: "/",
            queryStringParameters: {},
            headers: {
                "Accept": "application/json",
                "x-forwarded-for": "127.0.0.1",
                "user-agent": "test-agent",
            },
            multiValueHeaders: {},
            body: null,
            isBase64Encoded: false,
        };

        const result = await handler(mockEvent);

        expect(result.statusCode).toBe(200);
        expect(result.headers?.["Content-Type"]).toBe("application/json");

        const body = JSON.parse(result.body);
        expect(body.authenticated).toBe(false);
        expect(body.version).toBeDefined();
        expect(body.environment).toBeDefined();
        expect(body._links).toBeDefined();
        expect(body._links["auth:federate"]).toBeDefined();
        expect(body._links["sitemap"]).toBeDefined();
        expect(body._links["auth:verify"]).toBeUndefined();
        expect(body._links["auth:revoke"]).toBeUndefined();
    });
});
