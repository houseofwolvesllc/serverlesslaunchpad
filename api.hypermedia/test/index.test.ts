import { describe, it, expect } from "vitest";
import { handler } from "../src/index.js";
import type { ALBEvent } from "aws-lambda";

describe("ALB Handler", () => {
    it("should return a basic response", async () => {
        const mockEvent: ALBEvent = {
            requestContext: {
                elb: {
                    targetGroupArn: "arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/my-target-group/1234567890123456"
                }
            },
            httpMethod: "GET",
            path: "/",
            queryStringParameters: {},
            headers: {},
            multiValueHeaders: {},
            body: null,
            isBase64Encoded: false
        };

        const result = await handler(mockEvent);
        
        expect(result.statusCode).toBe(200);
        expect(result.headers?.["Content-Type"]).toBe("application/xhtml+xml");
        expect(result.body).toContain("Welcome to Serverless Launchpad API");
    });
});