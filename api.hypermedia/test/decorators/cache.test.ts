import { ALBEvent } from "aws-lambda";
import { describe, expect, it } from "vitest";
import { BaseController } from "../../src/base_controller";
import { Cache } from "../../src/decorators";
import { HalResourceAdapter } from "../../src/content_types/hal_adapter";

// Simple test adapter for cache decorator tests
class TestDataAdapter extends HalResourceAdapter {
    constructor(private testData: any) {
        super();
    }

    get _links() {
        return {
            self: this.createLink("/test"),
            ...this.getBaseLinks()
        };
    }

    get data() {
        return this.testData.data;
    }

    get count() {
        return this.testData.count;
    }
}

describe("@Cache Decorator", () => {
    describe("Basic Caching", () => {
        it("should cache GET requests with ETags", async () => {
            // Arrange
            class TestController extends BaseController {
                @Cache({ ttl: 300 })
                async testMethod(request: any) {
                    const adapter = new TestDataAdapter({ data: "test" });
                    return this.success(request, adapter);
                }
            }

            const controller = new TestController();
            const event: ALBEvent = {
                httpMethod: "GET",
                path: "/test",
                headers: {},
                requestContext: {} as any,
                body: null,
                isBase64Encoded: false,
                queryStringParameters: undefined,
                multiValueHeaders: {},
                multiValueQueryStringParameters: undefined,
            };

            // Act
            const result = await controller.testMethod(event);

            // Assert
            expect(result.headers?.["ETag"]).toBeDefined();
            expect(result.headers?.["Cache-Control"]).toBe("private, max-age=300, must-revalidate");
            expect(result.headers?.["X-Cache"]).toBe("MISS");
        });

        it("should return 304 for matching ETags", async () => {
            // Arrange
            class TestController extends BaseController {
                @Cache({ ttl: 300 })
                async testMethod(request: any) {
                    const adapter = new TestDataAdapter({ data: "test" });
                    return this.success(request, adapter);
                }
            }

            const controller = new TestController();

            // First request to populate cache
            const firstRequest: ALBEvent = {
                httpMethod: "GET",
                path: "/test",
                queryStringParameters: undefined,
                headers: {},
                requestContext: {} as any,
                body: null,
                isBase64Encoded: false,
                multiValueHeaders: {},
                multiValueQueryStringParameters: undefined,
            };

            const firstResult = await controller.testMethod(firstRequest);
            const etag = firstResult.headers?.["ETag"]?.toString();

            // Second request with If-None-Match
            const secondRequest: ALBEvent = {
                httpMethod: "GET",
                path: "/test",
                queryStringParameters: undefined,
                headers: { "if-none-match": etag },
                requestContext: {} as any,
                body: null,
                isBase64Encoded: false,
                multiValueHeaders: {},
                multiValueQueryStringParameters: undefined,
            };

            // Act
            const result = await controller.testMethod(secondRequest);

            // Assert
            expect(result.statusCode).toBe(304);
            expect(result.body).toBe("");
            expect(result.headers?.["X-Cache"]).toBe("HIT");
        });

        it("should not cache non-GET requests", async () => {
            // Arrange
            class TestController extends BaseController {
                @Cache({ ttl: 300 })
                async testMethod(request: any) {
                    const adapter = new TestDataAdapter({ data: "test" });
                    return this.success(request, adapter);
                }
            }

            const controller = new TestController();
            const request: ALBEvent = {
                httpMethod: "POST",
                path: "/test",
                queryStringParameters: undefined,
                headers: {},
                requestContext: {} as any,
                body: null,
                isBase64Encoded: false,
                multiValueHeaders: {},
                multiValueQueryStringParameters: undefined,
            };

            // Act
            const result = await controller.testMethod(request);

            // Assert
            expect(result.headers?.["ETag"]).toBeUndefined();
            expect(result.headers?.["Cache-Control"]).toBeUndefined();
            expect(result.headers?.["X-Cache"]).toBeUndefined();
        });
    });

    describe("Cache Configuration", () => {
        it("should respect custom TTL values", async () => {
            // Arrange
            class TestController extends BaseController {
                @Cache({ ttl: 600 })
                async testMethod(request: any) {
                    const adapter = new TestDataAdapter({ data: "test" });
                    return this.success(request, adapter);
                }
            }

            const controller = new TestController();
            const event: ALBEvent = {
                httpMethod: "GET",
                path: "/test",
                headers: {},
                requestContext: {} as any,
                body: null,
                isBase64Encoded: false,
                queryStringParameters: undefined,
                multiValueHeaders: {},
                multiValueQueryStringParameters: undefined,
            };

            // Act
            const result = await controller.testMethod(event);

            // Assert
            expect(result.headers?.["Cache-Control"]).toBe("private, max-age=600, must-revalidate");
        });

        it("should handle cache key based on path and query parameters", async () => {
            // Arrange
            class TestController extends BaseController {
                private callCount = 0;

                @Cache({ ttl: 300 })
                async testMethod(request: any) {
                    this.callCount++;
                    const adapter = new TestDataAdapter({ data: "test", count: this.callCount });
                    return this.success(request, adapter);
                }
            }

            const controller = new TestController();

            // First request with query params
            const firstRequest: ALBEvent = {
                httpMethod: "GET",
                path: "/test",
                queryStringParameters: { filter: "active" },
                headers: { accept: "application/json" },
                requestContext: {} as any,
                body: null,
                isBase64Encoded: false,
                multiValueHeaders: {},
                multiValueQueryStringParameters: undefined,
            };

            // Second request with different query params
            const secondRequest: ALBEvent = {
                httpMethod: "GET",
                path: "/test",
                queryStringParameters: { filter: "inactive" },
                headers: { accept: "application/json" },
                requestContext: {} as any,
                body: null,
                isBase64Encoded: false,
                multiValueHeaders: {},
                multiValueQueryStringParameters: undefined,
            };

            // Act
            const result1 = await controller.testMethod(firstRequest);
            const result2 = await controller.testMethod(secondRequest);

            // Assert - Different query params should result in different cache entries
            expect(result1.headers?.["X-Cache"]).toBe("MISS");
            expect(result2.headers?.["X-Cache"]).toBe("MISS");

            // Verify both calls actually executed (not cached)
            const body1 = JSON.parse(result1.body || "{}");
            const body2 = JSON.parse(result2.body || "{}");
            // HAL format: properties are flat at top level
            expect(body1.count).toBe(1);
            expect(body2.count).toBe(2);
        });
    });

    describe("Cache Headers", () => {
        it("should add appropriate cache headers", async () => {
            // Arrange
            class TestController extends BaseController {
                @Cache({ ttl: 300 })
                async testMethod(request: any) {
                    const adapter = new TestDataAdapter({ data: "test" });
                    return this.success(request, adapter);
                }
            }

            const controller = new TestController();
            const event: ALBEvent = {
                httpMethod: "GET",
                path: "/test",
                headers: {},
                requestContext: {} as any,
                body: null,
                isBase64Encoded: false,
                queryStringParameters: undefined,
                multiValueHeaders: {},
                multiValueQueryStringParameters: undefined,
            };

            // Act
            const result = await controller.testMethod(event);

            // Assert
            expect(result.headers?.["ETag"]).toMatch(/^[a-f0-9]+$/); // MD5 hash format
            expect(result.headers?.["Last-Modified"]).toBeDefined();
            expect(result.headers?.["Vary"]).toBe("Accept");
        });

        it("should return cache hit on subsequent identical requests", async () => {
            // Arrange
            class TestController extends BaseController {
                private callCount = 0;

                @Cache({ ttl: 300 })
                async testMethod(request: any) {
                    this.callCount++;
                    const adapter = new TestDataAdapter({ data: "test", count: this.callCount });
                    return this.success(request, adapter);
                }
            }

            const controller = new TestController();
            const event: ALBEvent = {
                httpMethod: "GET",
                path: "/test123",
                headers: { accept: "application/json" },
                requestContext: {} as any,
                body: null,
                isBase64Encoded: false,
                queryStringParameters: undefined,
                multiValueHeaders: {},
                multiValueQueryStringParameters: undefined,
            };

            // Act - Make two identical requests
            const result1 = await controller.testMethod(event);
            const result2 = await controller.testMethod(event);

            // Assert
            expect(result1.headers?.["X-Cache"]).toBe("MISS");
            expect(result2.headers?.["X-Cache"]).toBe("HIT");

            // Verify the method was only called once (second was cached)
            const body1 = JSON.parse(result1.body || "{}");
            const body2 = JSON.parse(result2.body || "{}");
            // HAL format: properties are flat at top level
            expect(body1.count).toBe(1);
            expect(body2.count).toBe(1); // Same count, cached result
        });
    });
});
