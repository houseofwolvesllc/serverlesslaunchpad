import { describe, it, expect } from "vitest";
import { ResponseBuilder } from "../../src/common/response_builder";
import { CONTENT_TYPES } from "../../src/common/content_negotiation";
import { 
    ValidationError, 
    UnauthorizedError, 
    ForbiddenError, 
    NotFoundError,
    ConflictError,
    UnprocessableEntityError,
    InternalServerError
} from "../../src/common/errors";
import { z } from "zod";

describe("Error Handling System", () => {
    describe("Error Classes", () => {
        it("should create ValidationError with 400 status", () => {
            const error = new ValidationError("Invalid input");
            expect(error.status).toBe(400);
            expect(error.title).toBe("Bad Request");
            expect(error.message).toBe("Invalid input");
        });
        
        it("should create ValidationError with Zod errors", () => {
            const zodError = z.object({ name: z.string() }).safeParse({ name: 123 });
            const error = new ValidationError("Validation failed", zodError.error);
            expect(error.status).toBe(400);
            expect(error.zodError).toBeDefined();
        });
        
        it("should create UnauthorizedError with 401 status", () => {
            const error = new UnauthorizedError("Please authenticate");
            expect(error.status).toBe(401);
            expect(error.title).toBe("Unauthorized");
            expect(error.message).toBe("Please authenticate");
        });
        
        it("should create ForbiddenError with 403 status", () => {
            const error = new ForbiddenError("Access denied");
            expect(error.status).toBe(403);
            expect(error.title).toBe("Forbidden");
            expect(error.message).toBe("Access denied");
        });
        
        it("should create NotFoundError with 404 status", () => {
            const error = new NotFoundError("Resource not found");
            expect(error.status).toBe(404);
            expect(error.title).toBe("Not Found");
            expect(error.message).toBe("Resource not found");
        });
        
        it("should create ConflictError with 409 status", () => {
            const error = new ConflictError("Resource already exists");
            expect(error.status).toBe(409);
            expect(error.title).toBe("Conflict");
            expect(error.message).toBe("Resource already exists");
        });
        
        it("should create UnprocessableEntityError with 422 status", () => {
            const error = new UnprocessableEntityError("Business rule violation");
            expect(error.status).toBe(422);
            expect(error.title).toBe("Unprocessable Entity");
            expect(error.message).toBe("Business rule violation");
        });
        
        it("should create InternalServerError with 500 status", () => {
            const error = new InternalServerError("Server error");
            expect(error.status).toBe(500);
            expect(error.title).toBe("Internal Server Error");
            expect(error.message).toBe("Server error");
        });
    });
    
    describe("Error Response Formatting", () => {
        it("should format error response in JSON with all metadata", () => {
            const error = new ValidationError("Invalid input");
            const result = ResponseBuilder.error(error, CONTENT_TYPES.JSON, {
                instance: "/test/path",
                violations: [
                    { field: "email", message: "Invalid email format" },
                    { field: "age", message: "Must be at least 18" }
                ]
            });
            
            expect(result.statusCode).toBe(400);
            expect(result.headers?.["Content-Type"]).toBe("application/json");
            
            const body = JSON.parse(result.body || '{}');
            expect(body.class).toContain("error");
            expect(body.class).toContain("validation-error");
            expect(body.properties).toMatchObject({
                status: 400,
                title: "Bad Request",
                detail: "Invalid input",
                instance: "/test/path"
            });
            expect(body.properties.timestamp).toBeDefined();
            expect(body.properties.traceId).toBeDefined();
            expect(body.properties.violations).toHaveLength(2);
            expect(body.links).toContainEqual({ rel: ["home"], href: "/" });
            expect(body.links).toContainEqual({ rel: ["help"], href: "/docs" });
        });
        
        it("should format error response in XHTML with all metadata", () => {
            const error = new NotFoundError("Page not found");
            const result = ResponseBuilder.error(error, CONTENT_TYPES.XHTML, {
                instance: "/missing/page"
            });
            
            expect(result.statusCode).toBe(404);
            expect(result.headers?.["Content-Type"]).toBe("application/xhtml+xml");
            
            expect(result.body).toContain('<!DOCTYPE html>');
            expect(result.body).toContain('typeof="slp:Error"');
            expect(result.body).toContain('<dd property="slp:status">404</dd>');
            expect(result.body).toContain('<dd property="slp:title">Not Found</dd>');
            expect(result.body).toContain('<dd property="slp:detail">Page not found</dd>');
            expect(result.body).toContain('<dd property="slp:instance">/missing/page</dd>');
            expect(result.body).toContain('property="slp:timestamp"');
            expect(result.body).toContain('property="slp:traceId"');
        });
        
        it("should handle generic errors as 500", () => {
            const error = new Error("Unexpected error");
            const result = ResponseBuilder.error(error, CONTENT_TYPES.JSON);
            
            expect(result.statusCode).toBe(500);
            const body = JSON.parse(result.body || '{}');
            expect(body.properties.status).toBe(500);
            expect(body.properties.title).toBe("Internal Server Error");
            expect(body.properties.detail).toBe("An unexpected error occurred");
        });
        
        it("should format validation violations correctly", () => {
            const schema = z.object({
                user: z.object({
                    sessions: z.array(z.object({
                        id: z.string()
                    }))
                })
            });
            
            const parseResult = schema.safeParse({
                user: {
                    sessions: [{ id: 123 }]
                }
            });
            
            const error = new ValidationError("Validation failed", parseResult.error);
            const result = ResponseBuilder.error(error, CONTENT_TYPES.JSON, {
                violations: parseResult.error?.issues.map(issue => ({
                    field: issue.path.join('.'),
                    message: issue.message
                }))
            });
            
            const body = JSON.parse(result.body || '{}');
            expect(body.properties.violations).toBeDefined();
            expect(body.properties.violations[0].field).toBe("user.sessions.0.id");
        });
    });
    
    describe("Error Metadata", () => {
        it("should generate unique traceId for each error", () => {
            const error1 = ResponseBuilder.error(new NotFoundError(), CONTENT_TYPES.JSON);
            const error2 = ResponseBuilder.error(new NotFoundError(), CONTENT_TYPES.JSON);
            
            const body1 = JSON.parse(error1.body || '{}');
            const body2 = JSON.parse(error2.body || '{}');
            
            expect(body1.properties.traceId).toBeDefined();
            expect(body2.properties.traceId).toBeDefined();
            expect(body1.properties.traceId).not.toBe(body2.properties.traceId);
        });
        
        it("should include timestamp in ISO format", () => {
            const error = ResponseBuilder.error(new NotFoundError(), CONTENT_TYPES.JSON);
            const body = JSON.parse(error.body || '{}');
            
            expect(body.properties.timestamp).toBeDefined();
            expect(new Date(body.properties.timestamp).toISOString()).toBe(body.properties.timestamp);
        });
    });
});