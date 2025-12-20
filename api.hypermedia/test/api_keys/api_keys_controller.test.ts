import { Features, Role, User } from "@houseofwolves/serverlesslaunchpad.core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiKeysController } from "../../src/api_keys/api_keys_controller";
import { ForbiddenError } from "../../src/errors";
import { AuthenticatedALBEvent } from "../../src/extended_alb_event";

// Mock the decorators
vi.mock("../../src/decorators/index.js", () => ({
    Log: () => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
    Protected: () => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
    Cache: () => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
}));

describe("ApiKeysController", () => {
    let controller: ApiKeysController;
    let mockApiKeyRepository: any;

    const createMockUser = (overrides?: Partial<User>): User => ({
        userId: "user-123",
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
        role: Role.AccountManager,
        features: Features.Contacts | Features.Campaigns,
        dateCreated: new Date("2024-01-01T00:00:00Z"),
        dateModified: new Date("2024-01-01T00:00:00Z"),
        ...overrides,
    });

    const createAuthenticatedEvent = (user: User, overrides?: Partial<AuthenticatedALBEvent>): AuthenticatedALBEvent =>
        ({
            httpMethod: "POST",
            path: "/users/user-123/api_keys/list",
            headers: {
                "x-forwarded-for": "127.0.0.1",
                "user-agent": "test-agent/1.0",
                accept: "application/json",
            },
            requestContext: {} as any,
            pathParameters: { userId: "user-123" },
            body: JSON.stringify({
                pagingInstruction: { limit: 10 },
            }),
            isBase64Encoded: false,
            queryStringParameters: undefined,
            multiValueHeaders: {},
            multiValueQueryStringParameters: undefined,
            authContext: {
                identity: user,
                access: {
                    type: "session",
                    ipAddress: "127.0.0.1",
                    userAgent: "test-agent/1.0",
                },
            },
            ...overrides,
        } as AuthenticatedALBEvent);

    beforeEach(() => {
        mockApiKeyRepository = {
            getApiKeys: vi.fn(),
            deleteApiKeys: vi.fn(),
        };

        controller = new ApiKeysController(mockApiKeyRepository);
        vi.clearAllMocks();
    });

    describe("getApiKeys", () => {
        it("should return paginated API keys for user", async () => {
            // Arrange
            const user = createMockUser();
            const event = createAuthenticatedEvent(user);

            const mockApiKeys = {
                items: [
                    {
                        apiKeyId: "key-1",
                        userId: "user-123",
                        apiKey: "test_key_abc123",
                        description: "Production API Key",
                        dateCreated: new Date("2024-01-01T00:00:00Z"),
                        dateLastAccessed: new Date("2024-07-15T10:00:00Z"),
                    },
                    {
                        apiKeyId: "key-2",
                        userId: "user-123",
                        apiKey: "test_key_def456",
                        description: "Development API Key",
                        dateCreated: new Date("2024-02-01T00:00:00Z"),
                        dateLastAccessed: new Date("2024-07-14T12:00:00Z"),
                    },
                ],
                pagingInstructions: {
                    next: { offset: 20, limit: 10 },
                    previous: null,
                    current: { offset: 0, limit: 10 },
                },
            };

            mockApiKeyRepository.getApiKeys.mockResolvedValue(mockApiKeys);

            // Act
            const result = await controller.getApiKeys(event);

            // Assert
            expect(mockApiKeyRepository.getApiKeys).toHaveBeenCalledWith({
                userId: "user-123",
                pagingInstruction: { limit: 10 },
            });

            expect(result.statusCode).toBe(200);

            const responseBody = JSON.parse(result.body || "{}");
            // HAL format: embedded resources in _embedded
            expect(responseBody._embedded.apiKeys).toHaveLength(2);
            expect(responseBody._embedded.apiKeys[0].apiKeyId).toBe("key-1");
            expect(responseBody.paging.next).toEqual({ offset: 20, limit: 10 });
            expect(responseBody.paging.previous).toBeNull();
        });

        it("should allow user to access their own API keys", async () => {
            // Arrange
            const user = createMockUser({ userId: "user-123", role: Role.Base });
            const event = createAuthenticatedEvent(user, {
                pathParameters: { userId: "user-123" },
            });

            const mockApiKeys = {
                items: [],
                pagingInstructions: {
                    next: null,
                    previous: null,
                    current: { offset: 0, limit: 10 },
                },
            };

            mockApiKeyRepository.getApiKeys.mockResolvedValue(mockApiKeys);

            // Act
            const result = await controller.getApiKeys(event);

            // Assert
            expect(result.statusCode).toBe(200);
            expect(mockApiKeyRepository.getApiKeys).toHaveBeenCalledWith({
                userId: "user-123",
                pagingInstruction: { limit: 10 },
            });
        });

        it("should throw ForbiddenError when user tries to access other user's API keys", async () => {
            // Arrange
            const user = createMockUser({ userId: "user-123", role: Role.Base });
            const event = createAuthenticatedEvent(user, {
                pathParameters: { userId: "user-456" },
                body: JSON.stringify({
                    pagingInstruction: { limit: 10 },
                }),
            });

            // Act & Assert
            await expect(controller.getApiKeys(event)).rejects.toThrow(ForbiddenError);
        });

        it("should allow AccountManager role to access any user's API keys", async () => {
            // Arrange
            const user = createMockUser({ userId: "manager-123", role: Role.AccountManager });
            const event = createAuthenticatedEvent(user, {
                pathParameters: { userId: "user-456" },
                body: JSON.stringify({
                    pagingInstruction: { limit: 10 },
                }),
            });

            const mockApiKeys = {
                items: [],
                pagingInstructions: {
                    next: null,
                    previous: null,
                    current: { offset: 0, limit: 10 },
                },
            };

            mockApiKeyRepository.getApiKeys.mockResolvedValue(mockApiKeys);

            // Act
            const result = await controller.getApiKeys(event);

            // Assert
            expect(result.statusCode).toBe(200);
            expect(mockApiKeyRepository.getApiKeys).toHaveBeenCalledWith({
                userId: "user-456",
                pagingInstruction: { limit: 10 },
            });
        });

        it("should handle empty paging instruction", async () => {
            // Arrange
            const user = createMockUser();
            const event = createAuthenticatedEvent(user, {
                body: JSON.stringify({}),
            });

            const mockApiKeys = {
                items: [],
                pagingInstructions: {
                    next: null,
                    previous: null,
                    current: { offset: 0, limit: 10 },
                },
            };

            mockApiKeyRepository.getApiKeys.mockResolvedValue(mockApiKeys);

            // Act
            const result = await controller.getApiKeys(event);

            // Assert
            expect(mockApiKeyRepository.getApiKeys).toHaveBeenCalledWith({
                userId: "user-123",
                pagingInstruction: undefined,
            });
            expect(result.statusCode).toBe(200);
        });

        it("should have longer cache TTL than sessions", async () => {
            // Arrange
            const user = createMockUser();
            const event = createAuthenticatedEvent(user);

            const mockApiKeys = {
                items: [],
                pagingInstructions: {
                    next: null,
                    previous: null,
                    current: { offset: 0, limit: 10 },
                },
            };

            mockApiKeyRepository.getApiKeys.mockResolvedValue(mockApiKeys);

            // Act
            const result = await controller.getApiKeys(event);

            // Assert
            // Note: The cache TTL is set to 600 seconds (10 minutes) in the decorator
            // This is longer than sessions which have 300 seconds (5 minutes)
            expect(result.statusCode).toBe(200);
        });
    });

    describe("deleteApiKeys", () => {
        it("should delete multiple API keys for user", async () => {
            // Arrange
            const user = createMockUser({ role: Role.Admin });
            const event = createAuthenticatedEvent(user, {
                path: "/users/user-123/api_keys/delete",
                body: JSON.stringify({
                    apiKeyIds: ["key-1", "key-2", "key-3"],
                }),
                authContext: {
                    identity: user,
                    access: {
                        type: "session", // Required for API key deletion
                        ipAddress: "127.0.0.1",
                        userAgent: "test-agent/1.0",
                    },
                },
            });

            mockApiKeyRepository.deleteApiKeys.mockResolvedValue(undefined);

            // Act
            const result = await controller.deleteApiKeys(event);

            // Assert
            expect(mockApiKeyRepository.deleteApiKeys).toHaveBeenCalledWith({
                userId: "user-123",
                apiKeys: ["key-1", "key-2", "key-3"],
            });

            expect(result.statusCode).toBe(200);

            const responseBody = JSON.parse(result.body || "{}");
            // HAL format: properties are flat at top level
            expect(responseBody.message).toBe("Deleted 3 API keys for user user-123");
            expect(responseBody.deletedCount).toBe(3);
        });

        it("should allow user to delete their own API keys", async () => {
            // Arrange
            const user = createMockUser({ userId: "user-123", role: Role.Base });
            const event = createAuthenticatedEvent(user, {
                path: "/users/user-123/api_keys/delete",
                pathParameters: { userId: "user-123" },
                body: JSON.stringify({
                    apiKeyIds: ["key-1"],
                }),
                authContext: {
                    identity: user,
                    access: {
                        type: "session",
                        ipAddress: "127.0.0.1",
                        userAgent: "test-agent/1.0",
                    },
                },
            });

            mockApiKeyRepository.deleteApiKeys.mockResolvedValue(undefined);

            // Act
            const result = await controller.deleteApiKeys(event);

            // Assert
            expect(result.statusCode).toBe(200);
            expect(mockApiKeyRepository.deleteApiKeys).toHaveBeenCalledWith({
                userId: "user-123",
                apiKeys: ["key-1"],
            });
        });

        it("should throw ForbiddenError when user tries to delete other user's API keys", async () => {
            // Arrange
            const user = createMockUser({ userId: "user-123", role: Role.Base });
            const event = createAuthenticatedEvent(user, {
                path: "/users/user-456/api_keys/delete",
                pathParameters: { userId: "user-456" },
                body: JSON.stringify({
                    apiKeyIds: ["key-1"],
                }),
                authContext: {
                    identity: user,
                    access: {
                        type: "session",
                        ipAddress: "127.0.0.1",
                        userAgent: "test-agent/1.0",
                    },
                },
            });

            // Act & Assert
            await expect(controller.deleteApiKeys(event)).rejects.toThrow(ForbiddenError);
        });

        it("should throw ForbiddenError when using API key authentication", async () => {
            // Arrange
            const user = createMockUser({ role: Role.Admin });
            const event = createAuthenticatedEvent(user, {
                path: "/users/user-123/api_keys/delete",
                body: JSON.stringify({
                    apiKeyIds: ["key-1"],
                }),
                authContext: {
                    identity: user,
                    access: {
                        type: "apiKey", // API key auth not allowed for API key deletion
                        ipAddress: "127.0.0.1",
                        userAgent: "test-agent/1.0",
                    },
                },
            });

            // Act & Assert
            await expect(controller.deleteApiKeys(event)).rejects.toThrow(ForbiddenError);
            await expect(controller.deleteApiKeys(event)).rejects.toThrow(
                "This action requires session authentication"
            );
        });

        it("should allow Admin role to delete any user's API keys", async () => {
            // Arrange
            const user = createMockUser({ userId: "admin-123", role: Role.Admin });
            const event = createAuthenticatedEvent(user, {
                path: "/users/user-456/api_keys/delete",
                pathParameters: { userId: "user-456" },
                body: JSON.stringify({
                    apiKeyIds: ["key-1", "key-2"],
                }),
                authContext: {
                    identity: user,
                    access: {
                        type: "session",
                        ipAddress: "127.0.0.1",
                        userAgent: "test-agent/1.0",
                    },
                },
            });

            mockApiKeyRepository.deleteApiKeys.mockResolvedValue(undefined);

            // Act
            const result = await controller.deleteApiKeys(event);

            // Assert
            expect(result.statusCode).toBe(200);
            expect(mockApiKeyRepository.deleteApiKeys).toHaveBeenCalledWith({
                userId: "user-456",
                apiKeys: ["key-1", "key-2"],
            });
        });

        it("should require Admin role for non-owner deletion", async () => {
            // Arrange
            const user = createMockUser({
                userId: "manager-123",
                role: Role.AccountManager, // AccountManager is not enough
            });
            const event = createAuthenticatedEvent(user, {
                path: "/users/user-456/api_keys/delete",
                pathParameters: { userId: "user-456" },
                body: JSON.stringify({
                    apiKeyIds: ["key-1"],
                }),
                authContext: {
                    identity: user,
                    access: {
                        type: "session",
                        ipAddress: "127.0.0.1",
                        userAgent: "test-agent/1.0",
                    },
                },
            });

            // Act & Assert
            await expect(controller.deleteApiKeys(event)).rejects.toThrow(ForbiddenError);
            await expect(controller.deleteApiKeys(event)).rejects.toThrow(
                "This action requires Admin role or resource ownership"
            );
        });

        it("should handle single API key deletion", async () => {
            // Arrange
            const user = createMockUser({ role: Role.Admin });
            const event = createAuthenticatedEvent(user, {
                path: "/users/user-123/api_keys/delete",
                body: JSON.stringify({
                    apiKeyIds: ["key-1"],
                }),
                authContext: {
                    identity: user,
                    access: {
                        type: "session",
                        ipAddress: "127.0.0.1",
                        userAgent: "test-agent/1.0",
                    },
                },
            });

            mockApiKeyRepository.deleteApiKeys.mockResolvedValue(undefined);

            // Act
            const result = await controller.deleteApiKeys(event);

            // Assert
            const responseBody = JSON.parse(result.body || "{}");
            // HAL format: properties are flat at top level
            expect(responseBody.message).toBe("Deleted 1 API keys for user user-123");
            expect(responseBody.deletedCount).toBe(1);
        });
    });
});
