import type { ALBEvent } from "aws-lambda";
import { describe, expect, it } from "vitest";
import { handler } from "../src/index.js";

describe("ALB Handler", () => {
    it("should return a basic response", async () => {
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
            headers: {},
            multiValueHeaders: {},
            body: null,
            isBase64Encoded: false,
        };

        const result = await handler(mockEvent);

        expect(result.statusCode).toBe(200);
        expect(result.headers?.["Content-Type"]).toBe("application/xhtml+xml");
        expect(result.body).toContain("Serverless Launchpad API");
    });
});
