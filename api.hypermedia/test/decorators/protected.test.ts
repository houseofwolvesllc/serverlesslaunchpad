import { Container, Features, Role, User } from "@houseofwolves/serverlesslaunchpad.core";
import { ALBEvent } from "aws-lambda";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BaseController } from "../../src/base_controller";
import { Protected } from "../../src/decorators";
import { ForbiddenError, UnauthorizedError } from "../../src/errors";

// Mock the container
vi.mock("../../src/container", () => ({
    getContainer: vi.fn(),
}));

describe("@Protected Decorator", () => {
    let mockContainer: Container;
    let mockAuthenticator: any;
    let mockUser: User;

    beforeEach(async () => {
        // Set up mock container
        mockContainer = {
            resolve: vi.fn(),
        } as any;

        // Set up mock authenticator
        mockAuthenticator = {
            verify: vi.fn(),
        };

        // Set up mock user
        mockUser = {
            userId: "user123",
            email: "test@example.com",
            firstName: "Test",
            lastName: "User",
            role: Role.Support,
            features: Features.Contacts | Features.Campaigns,
            dateCreated: new Date(),
            dateModified: new Date(),
        };

        // Configure container to return mocked services
        (mockContainer.resolve as any).mockReturnValue(mockAuthenticator);
        const { getContainer } = await import("../../src/container");
        (getContainer as any).mockReturnValue(mockContainer);
    });

    describe("Authentication", () => {
        it("should authenticate user and enrich request context", async () => {
            // Arrange
            class TestController {
                @Protected()
                async testMethod(request: any) {
                    return request;
                }
            }

            const controller = new TestController();
            const mockEvent: Partial<ALBEvent> = {
                path: "/users/user123/sessions",
                headers: {
                    Authorization: "ApiKey test-key",
                    "x-forwarded-for": "127.0.0.1",
                    "user-agent": "test-agent",
                },
            };

            mockAuthenticator.verify.mockResolvedValue({
                authContext: {
                    identity: mockUser,
                    access: {
                        type: "apiKey",
                        ipAddress: "127.0.0.1",
                    },
                },
            });

            // Act
            const result = await controller.testMethod(mockEvent);

            // Assert
            expect(mockAuthenticator.verify).toHaveBeenCalledWith({
                apiKey: "test-key",
                ipAddress: "127.0.0.1",
                userAgent: "test-agent",
            });

            expect(result.authContext.identity).toBeDefined();
            expect(result.authContext.access.type).toBe("apiKey");
        });

        it("should throw UnauthorizedError when authentication fails", async () => {
            // Arrange
            class TestController {
                @Protected()
                async testMethod(_request: any) {
                    return { success: true };
                }
            }

            const controller = new TestController();
            const request = {
                headers: {
                    Authorization: "ApiKey test-key",
                    "x-forwarded-for": "127.0.0.1",
                    "user-agent": "test-agent",
                },
            };

            mockAuthenticator.verify.mockResolvedValue(false);

            // Act & Assert
            await expect(controller.testMethod(request)).rejects.toThrow(UnauthorizedError);
        });

        it("should detect session authentication type", async () => {
            // Arrange
            class TestController {
                @Protected()
                async testMethod(request: any) {
                    return request;
                }
            }

            const controller = new TestController();
            const request = {
                path: "/test",
                headers: {
                    Authorization: "SessionToken abc123",
                    "x-forwarded-for": "127.0.0.1",
                    "user-agent": "test-agent",
                },
            };

            mockAuthenticator.verify.mockResolvedValue({
                authContext: {
                    identity: mockUser,
                    access: {
                        type: "session",
                        ipAddress: "127.0.0.1",
                    },
                },
            });

            // Act
            const result = await controller.testMethod(request);

            // Assert
            expect(result.authContext.access.type).toBe("session");
        });
    });

    describe("Authorization with BaseController", () => {
        it("should allow access when user has required role", async () => {
            // Arrange
            mockAuthenticator.verify.mockResolvedValue({
                authContext: {
                    identity: mockUser,
                    access: {
                        type: "apiKey",
                        ipAddress: "127.0.0.1",
                    },
                },
            });

            class TestController extends BaseController {
                @Protected()
                async testMethod(request: any) {
                    this.requireRole(request.authContext.identity, Role.Support);
                    return { success: true };
                }
            }

            const controller = new TestController();
            const event: ALBEvent = {
                httpMethod: "GET",
                path: "/test",
                headers: {
                    Authorization: "ApiKey token123",
                    "x-forwarded-for": "127.0.0.1",
                    "user-agent": "test-agent",
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
            expect(result.success).toBe(true);
        });

        it("should allow access when user is owner", async () => {
            // Arrange
            const baseUser = { ...mockUser, role: Role.Base };
            mockAuthenticator.verify.mockResolvedValue({
                authContext: {
                    identity: baseUser,
                    access: {
                        type: "apiKey",
                        ipAddress: "127.0.0.1",
                    },
                },
            });

            class TestController extends BaseController {
                @Protected()
                async testMethod(request: any) {
                    this.requireRole(request.authContext.identity, Role.Support, {
                        allowOwner: true,
                        resourceUserId: baseUser.userId,
                    });
                    return { success: true };
                }
            }

            const controller = new TestController();
            const event: ALBEvent = {
                httpMethod: "GET",
                path: "/users/user123",
                headers: {
                    Authorization: "ApiKey token123",
                    "x-forwarded-for": "127.0.0.1",
                    "user-agent": "test-agent",
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
            expect(result.success).toBe(true);
        });

        it("should throw ForbiddenError when user lacks required role", async () => {
            // Arrange
            const basicUser = { ...mockUser, role: Role.Base };
            mockAuthenticator.verify.mockResolvedValue({
                authContext: {
                    identity: basicUser,
                    access: {
                        type: "apiKey",
                        ipAddress: "127.0.0.1",
                    },
                },
            });

            class TestController extends BaseController {
                @Protected()
                async testMethod(request: any) {
                    this.requireRole(request.authContext.identity, Role.Support);
                    return { success: true };
                }
            }

            const controller = new TestController();
            const event: ALBEvent = {
                httpMethod: "GET",
                path: "/test",
                headers: {
                    Authorization: "ApiKey token123",
                    "x-forwarded-for": "127.0.0.1",
                    "user-agent": "test-agent",
                },
                requestContext: {} as any,
                body: null,
                isBase64Encoded: false,
                queryStringParameters: undefined,
                multiValueHeaders: {},
                multiValueQueryStringParameters: undefined,
            };

            // Act & Assert
            await expect(controller.testMethod(event)).rejects.toThrow(ForbiddenError);
        });

        it("should check feature requirements using bitwise operations", async () => {
            // Arrange
            mockAuthenticator.verify.mockResolvedValue({
                authContext: {
                    identity: mockUser,
                    access: {
                        type: "apiKey",
                        ipAddress: "127.0.0.1",
                    },
                },
            });

            class TestController extends BaseController {
                @Protected()
                async testMethod(request: any) {
                    this.requireRole(request.authContext.identity, Role.Support);
                    this.requireFeatures(request.authContext.identity, Features.Contacts);
                    return { success: true };
                }
            }

            const controller = new TestController();
            const event: ALBEvent = {
                httpMethod: "GET",
                path: "/test",
                headers: {
                    Authorization: "ApiKey token123",
                    "x-forwarded-for": "127.0.0.1",
                    "user-agent": "test-agent",
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
            expect(result.success).toBe(true);
        });

        it("should throw ForbiddenError when user lacks required features", async () => {
            // Arrange
            mockAuthenticator.verify.mockResolvedValue({
                authContext: {
                    identity: mockUser,
                    access: {
                        type: "apiKey",
                        ipAddress: "127.0.0.1",
                    },
                },
            });

            class TestController extends BaseController {
                @Protected()
                async testMethod(request: any) {
                    this.requireRole(request.authContext.identity, Role.Support);
                    this.requireFeatures(request.authContext.identity, Features.Links);
                    return { success: true };
                }
            }

            const controller = new TestController();
            const event: ALBEvent = {
                httpMethod: "GET",
                path: "/test",
                headers: {
                    Authorization: "ApiKey token123",
                    "x-forwarded-for": "127.0.0.1",
                    "user-agent": "test-agent",
                },
                requestContext: {} as any,
                body: null,
                isBase64Encoded: false,
                queryStringParameters: undefined,
                multiValueHeaders: {},
                multiValueQueryStringParameters: undefined,
            };

            // Act & Assert
            await expect(controller.testMethod(event)).rejects.toThrow(ForbiddenError);
        });

        it("should enforce session requirement", async () => {
            // Arrange
            mockAuthenticator.verify.mockResolvedValue({
                authContext: {
                    identity: mockUser,
                    access: {
                        type: "apiKey",
                        ipAddress: "127.0.0.1",
                    },
                },
            });

            class TestController extends BaseController {
                @Protected()
                async testMethod(request: any) {
                    this.requireSessionAuth(request);
                    return { success: true };
                }
            }

            const controller = new TestController();
            const event: ALBEvent = {
                httpMethod: "GET",
                path: "/test",
                headers: {
                    Authorization: "ApiKey abc123",
                    "x-forwarded-for": "127.0.0.1",
                    "user-agent": "test-agent",
                },
                requestContext: {} as any,
                body: null,
                isBase64Encoded: false,
                queryStringParameters: undefined,
                multiValueHeaders: {},
                multiValueQueryStringParameters: undefined,
            };

            // Act & Assert
            await expect(controller.testMethod(event)).rejects.toThrow(ForbiddenError);
        });
    });
});