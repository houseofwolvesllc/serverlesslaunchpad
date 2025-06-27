import { describe, it, expect } from "vitest";
import { ResponseBuilder } from "../../src/common/response_builder";
import { CONTENT_TYPES } from "../../src/common/content_negotiation";
import { ValidationError, NotFoundError } from "../../src/common/errors";

describe("ResponseBuilder", () => {
    describe("success", () => {
        it("should build JSON success response", () => {
            const data = { userId: "123", email: "test@example.com" };
            const result = ResponseBuilder.success(data, CONTENT_TYPES.JSON, {
                links: [
                    { rel: ["self"], href: "/users/123" }
                ]
            });

            expect(result.statusCode).toBe(200);
            expect(result.headers?.["Content-Type"]).toBe(CONTENT_TYPES.JSON);
            
            const body = JSON.parse(result.body || '{}');
            expect(body.properties).toEqual(data);
            expect(body.links).toHaveLength(1);
            expect(body.links[0].rel).toEqual(["self"]);
        });

        it("should build XHTML success response", () => {
            const data = { userId: "123", email: "test@example.com" };
            const result = ResponseBuilder.success(data, CONTENT_TYPES.XHTML, {
                metadata: {
                    title: "User Profile",
                    resourceType: "User"
                }
            });

            expect(result.statusCode).toBe(200);
            expect(result.headers?.["Content-Type"]).toBe(CONTENT_TYPES.XHTML);
            expect(result.body).toContain("<!DOCTYPE html>");
            expect(result.body).toContain("User Profile");
            expect(result.body).toContain("test@example.com");
        });

        it("should handle custom status codes", () => {
            const result = ResponseBuilder.success({}, CONTENT_TYPES.JSON, {
                status: 201
            });
            expect(result.statusCode).toBe(201);
        });

        it("should handle custom headers", () => {
            const result = ResponseBuilder.success({}, CONTENT_TYPES.JSON, {
                headers: {
                    "X-Custom-Header": "value"
                }
            });
            expect(result.headers?.["X-Custom-Header"]).toBe("value");
        });
    });

    describe("error", () => {
        it("should build JSON error response", () => {
            const error = new ValidationError("Invalid input");
            const result = ResponseBuilder.error(error, CONTENT_TYPES.JSON, {
                violations: [
                    { field: "email", message: "Invalid email format" }
                ]
            });

            expect(result.statusCode).toBe(400);
            const body = JSON.parse(result.body || '{}');
            expect(body.class).toContain("error");
            expect(body.class).toContain("validation-error");
            expect(body.properties.status).toBe(400);
            expect(body.properties.violations).toHaveLength(1);
        });

        it("should build XHTML error response", () => {
            const error = new NotFoundError("Resource not found");
            const result = ResponseBuilder.error(error, CONTENT_TYPES.XHTML, {
                instance: "/users/999"
            });

            expect(result.statusCode).toBe(404);
            expect(result.body).toContain("<!DOCTYPE html>");
            expect(result.body).toContain("Not Found");
            expect(result.body).toContain("Resource not found");
            expect(result.body).toContain("/users/999");
        });

        it("should handle generic errors as 500", () => {
            const error = new Error("Something went wrong");
            const result = ResponseBuilder.error(error, CONTENT_TYPES.JSON);

            expect(result.statusCode).toBe(500);
            const body = JSON.parse(result.body || '{}');
            expect(body.properties.status).toBe(500);
            expect(body.properties.title).toBe("Internal Server Error");
        });
    });

    describe("redirect", () => {
        it("should build redirect response with default 302", () => {
            const result = ResponseBuilder.redirect("/new-location");
            
            expect(result.statusCode).toBe(302);
            expect(result.headers?.Location).toBe("/new-location");
            expect(result.body).toBe("");
        });

        it("should build redirect response with custom status", () => {
            const result = ResponseBuilder.redirect("/new-location", {
                status: 301
            });
            
            expect(result.statusCode).toBe(301);
        });
    });
});