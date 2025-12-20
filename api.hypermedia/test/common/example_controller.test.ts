import { describe, it, expect } from "vitest";
import { ResponseBuilder } from "../../src/common/response_builder";
import { CONTENT_TYPES } from "../../src/common/content_negotiation";
import { ValidationError } from "../../src/common/errors";


describe("Content Negotiation Example", () => {
    describe("Response formatting", () => {
        it("should format response for JSON", () => {
            const responseData = {
                data: { userId: "123", email: "test@example.com" },
                links: [{ rel: ["self"], href: "/users/123" }],
                metadata: { title: "User Profile", resourceType: "User" }
            };
            
            const result = ResponseBuilder.success(responseData.data, CONTENT_TYPES.JSON, {
                links: responseData.links,
                metadata: responseData.metadata
            });
            
            const body = JSON.parse(result.body || '{}');
            expect(body).toMatchObject({
                properties: { userId: "123", email: "test@example.com" },
                links: [{ rel: ["self"], href: "/users/123" }]
            });
        });
        
        it("should format response for XHTML", () => {
            const responseData = {
                data: { userId: "123", email: "test@example.com" },
                links: [{ rel: ["self"], href: "/users/123" }],
                metadata: { title: "User Profile", resourceType: "User" }
            };
            
            const result = ResponseBuilder.success(responseData.data, CONTENT_TYPES.XHTML, {
                links: responseData.links,
                metadata: responseData.metadata
            });
            
            expect(result.body).toContain("<!DOCTYPE html>");
            expect(result.body).toContain("User Profile");
            expect(result.body).toContain("test@example.com");
            expect(result.body).toContain('href="/users/123"');
        });
        
        it("should format validation errors properly", () => {
            const error = new ValidationError(
                "Invalid user data",
                {
                    issues: [
                        { path: ["email"], message: "Invalid email format" },
                        { path: ["name"], message: "Required field" }
                    ]
                }
            );
            
            const jsonResult = ResponseBuilder.error(error, CONTENT_TYPES.JSON, {
                violations: error.zodError.issues.map((issue: any) => ({
                    field: issue.path.join('.'),
                    message: issue.message
                }))
            });
            
            const jsonBody = JSON.parse(jsonResult.body || '{}');
            expect(jsonBody.properties.violations).toHaveLength(2);
            expect(jsonBody.properties.violations[0]).toEqual({
                field: "email",
                message: "Invalid email format"
            });
            
            const xhtmlResult = ResponseBuilder.error(error, CONTENT_TYPES.XHTML, {
                violations: error.zodError.issues.map((issue: any) => ({
                    field: issue.path.join('.'),
                    message: issue.message
                }))
            });
            
            expect(xhtmlResult.body).toContain("Invalid email format");
            expect(xhtmlResult.body).toContain("Required field");
        });
    });
});