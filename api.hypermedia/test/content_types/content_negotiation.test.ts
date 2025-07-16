import type { ALBEvent } from "aws-lambda";
import { describe, expect, it } from "vitest";
import { CONTENT_TYPES, getAcceptedContentType } from "../../src/content_types/content_negotiation";

describe("Content Negotiation", () => {
    const createEvent = (acceptHeader?: string): ALBEvent => ({
        requestContext: {
            elb: {
                targetGroupArn: "test",
            },
        },
        httpMethod: "GET",
        path: "/test",
        headers: acceptHeader ? { Accept: acceptHeader } : {},
        isBase64Encoded: false,
        body: null,
        queryStringParameters: undefined,
        multiValueQueryStringParameters: undefined,
        multiValueHeaders: undefined,
    });

    describe("getAcceptedContentType", () => {
        it("should default to XHTML when no Accept header is provided", () => {
            const event = createEvent();
            expect(getAcceptedContentType(event)).toBe(CONTENT_TYPES.XHTML);
        });

        it("should default to XHTML for generic browser Accept header", () => {
            const event = createEvent("*/*");
            expect(getAcceptedContentType(event)).toBe(CONTENT_TYPES.XHTML);
        });

        it("should default to XHTML when text/html is in Accept header", () => {
            const event = createEvent("text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
            expect(getAcceptedContentType(event)).toBe(CONTENT_TYPES.XHTML);
        });

        it("should return JSON when explicitly requested", () => {
            const event = createEvent("application/json");
            expect(getAcceptedContentType(event)).toBe(CONTENT_TYPES.JSON);
        });

        it("should return JSON when application/* is requested", () => {
            const event = createEvent("application/*");
            expect(getAcceptedContentType(event)).toBe(CONTENT_TYPES.JSON);
        });

        it("should return XHTML when explicitly requested", () => {
            const event = createEvent("application/xhtml+xml");
            expect(getAcceptedContentType(event)).toBe(CONTENT_TYPES.XHTML);
        });

        it("should respect quality values and choose highest priority supported type", () => {
            const event = createEvent("text/plain;q=0.5,application/json;q=0.9,application/xhtml+xml;q=0.8");
            expect(getAcceptedContentType(event)).toBe(CONTENT_TYPES.JSON);
        });

        it("should handle multiple types and return first supported", () => {
            const event = createEvent("text/plain,application/json,application/xhtml+xml");
            expect(getAcceptedContentType(event)).toBe(CONTENT_TYPES.JSON);
        });

        it("should default to XHTML for unsupported types", () => {
            const event = createEvent("text/plain,image/png");
            expect(getAcceptedContentType(event)).toBe(CONTENT_TYPES.XHTML);
        });

        it("should handle case-insensitive header names", () => {
            const event: ALBEvent = {
                requestContext: {
                    elb: {
                        targetGroupArn: "test",
                    },
                },
                httpMethod: "GET",
                path: "/test",
                headers: { accept: "application/json" },
                isBase64Encoded: false,
                body: null,
                queryStringParameters: undefined,
                multiValueQueryStringParameters: undefined,
                multiValueHeaders: undefined,
            };
            expect(getAcceptedContentType(event)).toBe(CONTENT_TYPES.JSON);
        });
    });
});
