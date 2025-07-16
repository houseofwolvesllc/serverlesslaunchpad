import { Container } from "@houseofwolves/serverlesslaunchpad.core";
import { ALBEvent } from "aws-lambda";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Log, Debug } from "../../src/decorators";
import { ApiLogger } from "../../src/logging/api_logger";

// Mock the container
vi.mock("../../src/container", () => ({
    getContainer: vi.fn(),
}));

describe("@Log Decorator", () => {
    let mockContainer: Container;
    let mockLogger: ApiLogger;

    beforeEach(async () => {
        // Set up mock container
        mockContainer = {
            resolve: vi.fn(),
        } as any;

        // Set up mock logger
        mockLogger = {
            logRequestStart: vi.fn(),
            logRequestSuccess: vi.fn(),
            logRequestError: vi.fn(),
        } as any;

        // Configure container to return mocked logger
        (mockContainer.resolve as any).mockReturnValue(mockLogger);
        const { getContainer } = await import("../../src/container");
        (getContainer as any).mockReturnValue(mockContainer);
    });

    describe("Request Logging", () => {
        it("should log request start and success for successful methods", async () => {
            // Arrange
            class TestController {
                @Log()
                async testMethod(event: ALBEvent) {
                    return { statusCode: 200, body: "success" };
                }
            }

            const controller = new TestController();
            const event: ALBEvent = {
                httpMethod: "GET",
                path: "/test",
                headers: {
                    "x-amzn-trace-id": "trace-123",
                    "user-agent": "test-agent",
                    "x-forwarded-for": "127.0.0.1",
                },
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
            expect(mockContainer.resolve).toHaveBeenCalledWith(ApiLogger);
            expect(mockLogger.logRequestStart).toHaveBeenCalledWith(
                "Starting TestController.testMethod",
                event,
                { class: "TestController", method: "testMethod" }
            );
            expect(mockLogger.logRequestSuccess).toHaveBeenCalledWith(
                "Completed TestController.testMethod",
                event,
                200,
                expect.any(Number), // duration
                { class: "TestController", method: "testMethod" }
            );
            expect(result.statusCode).toBe(200);
        });

        it("should log request start and error for failed methods", async () => {
            // Arrange
            const testError = new Error("Test error");
            
            class TestController {
                @Log()
                async testMethod(event: ALBEvent) {
                    throw testError;
                }
            }

            const controller = new TestController();
            const event: ALBEvent = {
                httpMethod: "POST",
                path: "/test",
                headers: {
                    "x-amzn-trace-id": "trace-456",
                },
                requestContext: {} as any,
                body: null,
                isBase64Encoded: false,
                queryStringParameters: undefined,
                multiValueHeaders: {},
                multiValueQueryStringParameters: undefined,
            };

            // Act & Assert
            await expect(controller.testMethod(event)).rejects.toThrow("Test error");
            
            expect(mockLogger.logRequestStart).toHaveBeenCalledWith(
                "Starting TestController.testMethod",
                event,
                { class: "TestController", method: "testMethod" }
            );
            expect(mockLogger.logRequestError).toHaveBeenCalledWith(
                "Failed TestController.testMethod",
                event,
                testError,
                expect.any(Number), // duration
                { class: "TestController", method: "testMethod" }
            );
            expect(mockLogger.logRequestSuccess).not.toHaveBeenCalled();
        });

        it("should extract status code from response", async () => {
            // Arrange
            class TestController {
                @Log()
                async testMethod(event: ALBEvent) {
                    return { statusCode: 201, body: "created" };
                }
            }

            const controller = new TestController();
            const event: ALBEvent = {
                httpMethod: "POST",
                path: "/users",
                headers: {},
                requestContext: {} as any,
                body: null,
                isBase64Encoded: false,
                queryStringParameters: undefined,
                multiValueHeaders: {},
                multiValueQueryStringParameters: undefined,
            };

            // Act
            await controller.testMethod(event);

            // Assert
            expect(mockLogger.logRequestSuccess).toHaveBeenCalledWith(
                "Completed TestController.testMethod",
                event,
                201, // Should extract 201 from response
                expect.any(Number),
                { class: "TestController", method: "testMethod" }
            );
        });

        it("should default to status code 200 when response has no statusCode", async () => {
            // Arrange
            class TestController {
                @Log()
                async testMethod(event: ALBEvent) {
                    return { data: "success" }; // No statusCode property
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
            await controller.testMethod(event);

            // Assert
            expect(mockLogger.logRequestSuccess).toHaveBeenCalledWith(
                "Completed TestController.testMethod",
                event,
                200, // Should default to 200
                expect.any(Number),
                { class: "TestController", method: "testMethod" }
            );
        });
    });

    describe("Timing", () => {
        it("should measure and log execution duration", async () => {
            // Arrange
            class TestController {
                @Log()
                async testMethod(event: ALBEvent) {
                    // Simulate some async work
                    await new Promise(resolve => setTimeout(resolve, 10));
                    return { statusCode: 200 };
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
            await controller.testMethod(event);

            // Assert
            const successCall = mockLogger.logRequestSuccess.mock.calls[0];
            const duration = successCall[3]; // Fourth argument is duration
            expect(duration).toBeGreaterThan(0);
            expect(duration).toBeLessThan(1000); // Should be reasonable duration
        });

        it("should measure duration even when method throws", async () => {
            // Arrange
            class TestController {
                @Log()
                async testMethod(event: ALBEvent) {
                    await new Promise(resolve => setTimeout(resolve, 10));
                    throw new Error("Test error");
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
            await expect(controller.testMethod(event)).rejects.toThrow();

            // Assert
            const errorCall = mockLogger.logRequestError.mock.calls[0];
            const duration = errorCall[3]; // Fourth argument is duration
            expect(duration).toBeGreaterThan(0);
        });
    });

    describe("Method Context", () => {
        it("should include correct class and method names in context", async () => {
            // Arrange
            class UserController {
                @Log()
                async getUser(event: ALBEvent) {
                    return { statusCode: 200 };
                }
            }

            const controller = new UserController();
            const event: ALBEvent = {
                httpMethod: "GET",
                path: "/users/123",
                headers: {},
                requestContext: {} as any,
                body: null,
                isBase64Encoded: false,
                queryStringParameters: undefined,
                multiValueHeaders: {},
                multiValueQueryStringParameters: undefined,
            };

            // Act
            await controller.getUser(event);

            // Assert
            expect(mockLogger.logRequestStart).toHaveBeenCalledWith(
                "Starting UserController.getUser",
                event,
                { class: "UserController", method: "getUser" }
            );
            expect(mockLogger.logRequestSuccess).toHaveBeenCalledWith(
                "Completed UserController.getUser",
                event,
                200,
                expect.any(Number),
                { class: "UserController", method: "getUser" }
            );
        });
    });

    describe("Debug Decorator", () => {
        it("should work as an alias for Log decorator", async () => {
            // Arrange
            class TestController {
                @Debug()
                async testMethod(event: ALBEvent) {
                    return { statusCode: 200 };
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
            await controller.testMethod(event);

            // Assert - Should behave exactly like @Log()
            expect(mockLogger.logRequestStart).toHaveBeenCalled();
            expect(mockLogger.logRequestSuccess).toHaveBeenCalled();
        });
    });

    describe("Container Integration", () => {
        it("should resolve ApiLogger from container", async () => {
            // Arrange
            class TestController {
                @Log()
                async testMethod(event: ALBEvent) {
                    return { statusCode: 200 };
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
            await controller.testMethod(event);

            // Assert
            expect(mockContainer.resolve).toHaveBeenCalledWith(ApiLogger);
        });
    });
});