import { Features, Role, User } from "@houseofwolves/serverlesslaunchpad.core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForbiddenError } from "../../src/errors";
import { AuthenticatedALBEvent } from "../../src/extended_alb_event";
import { SessionsController } from "../../src/sessions/sessions_controller";

// Mock the decorators
vi.mock("../../src/decorators/index.js", () => ({
    Log: () => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
    Protected: () => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
    Cache: () => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
}));

describe("SessionsController", () => {
    let controller: SessionsController;
    let mockSessionRepository: any;

    const createMockUser = (overrides?: Partial<User>): User => ({
        userId: "user-123",
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
        role: Role.Support,
        features: Features.Contacts | Features.Campaigns,
        dateCreated: new Date("2024-01-01T00:00:00Z"),
        dateModified: new Date("2024-01-01T00:00:00Z"),
        ...overrides,
    });

    const createAuthenticatedEvent = (user: User, overrides?: Partial<AuthenticatedALBEvent>): AuthenticatedALBEvent =>
        ({
            httpMethod: "POST",
            path: "/users/user-123/sessions/list",
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
        mockSessionRepository = {
            getSessions: vi.fn(),
            deleteSessions: vi.fn(),
        };

        controller = new SessionsController(mockSessionRepository);
    });

    describe("getSessions", () => {
        it("should return paginated sessions for user", async () => {
            // Arrange
            const user = createMockUser();
            const event = createAuthenticatedEvent(user);

            const mockSessions = {
                items: [
                    {
                        sessionId: "session-1",
                        userId: "user-123",
                        ipAddress: "127.0.0.1",
                        userAgent: "test-agent/1.0",
                        dateCreated: new Date("2024-07-15T08:00:00Z"),
                        dateExpires: new Date("2024-07-15T14:00:00Z"),
                        dateLastAccessed: new Date("2024-07-15T10:00:00Z"),
                    },
                    {
                        sessionId: "session-2",
                        userId: "user-123",
                        ipAddress: "192.168.1.1",
                        userAgent: "mobile-app/1.0",
                        dateCreated: new Date("2024-07-14T08:00:00Z"),
                        dateExpires: new Date("2024-07-14T14:00:00Z"),
                        dateLastAccessed: new Date("2024-07-14T12:00:00Z"),
                    },
                ],
                pagingInstructions: {
                    next: { offset: 20, limit: 10 },
                    previous: null,
                    current: { offset: 0, limit: 10 },
                },
            };

            mockSessionRepository.getSessions.mockResolvedValue(mockSessions);

            // Act
            const result = await controller.getSessions(event);

            // Assert
            expect(mockSessionRepository.getSessions).toHaveBeenCalledWith({
                userId: "user-123",
                pagingInstruction: { limit: 10 },
            });

            expect(result.statusCode).toBe(200);

            const responseBody = JSON.parse(result.body || "{}");
            // HAL format: embedded resources in _embedded
            expect(responseBody._embedded.sessions).toHaveLength(2);
            expect(responseBody._embedded.sessions[0].sessionId).toBe("session-1");
            expect(responseBody.paging.next).toEqual({ offset: 20, limit: 10 });
            expect(responseBody.paging.previous).toBeNull();
        });

        it("should allow user to access their own sessions", async () => {
            // Arrange
            const user = createMockUser({ userId: "user-123", role: Role.Base });
            const event = createAuthenticatedEvent(user, {
                pathParameters: { userId: "user-123" },
            });

            const mockSessions = {
                items: [],
                pagingInstructions: {
                    next: null,
                    previous: null,
                    current: { offset: 0, limit: 10 },
                },
            };

            mockSessionRepository.getSessions.mockResolvedValue(mockSessions);

            // Act
            const result = await controller.getSessions(event);

            // Assert
            expect(result.statusCode).toBe(200);
            expect(mockSessionRepository.getSessions).toHaveBeenCalledWith({
                userId: "user-123",
                pagingInstruction: { limit: 10 },
            });
        });

        it("should throw ForbiddenError when user tries to access other user's sessions", async () => {
            // Arrange
            const user = createMockUser({ userId: "user-123", role: Role.Base });
            const event = createAuthenticatedEvent(user, {
                pathParameters: { userId: "user-456" },
                body: JSON.stringify({
                    pagingInstruction: { limit: 10 },
                }),
            });

            // Act & Assert
            await expect(controller.getSessions(event)).rejects.toThrow(ForbiddenError);
        });

        it("should allow Support role to access any user's sessions", async () => {
            // Arrange
            const user = createMockUser({ userId: "admin-123", role: Role.Support });
            const event = createAuthenticatedEvent(user, {
                pathParameters: { userId: "user-456" },
                body: JSON.stringify({
                    pagingInstruction: { limit: 10 },
                }),
            });

            const mockSessions = {
                items: [],
                pagingInstructions: {
                    next: null,
                    previous: null,
                    current: { offset: 0, limit: 10 },
                },
            };

            mockSessionRepository.getSessions.mockResolvedValue(mockSessions);

            // Act
            const result = await controller.getSessions(event);

            // Assert
            expect(result.statusCode).toBe(200);
            expect(mockSessionRepository.getSessions).toHaveBeenCalledWith({
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

            const mockSessions = {
                items: [],
                pagingInstructions: {
                    next: null,
                    previous: null,
                    current: { offset: 0, limit: 10 },
                },
            };

            mockSessionRepository.getSessions.mockResolvedValue(mockSessions);

            // Act
            const result = await controller.getSessions(event);

            // Assert
            expect(mockSessionRepository.getSessions).toHaveBeenCalledWith({
                userId: "user-123",
                pagingInstruction: undefined,
            });
            expect(result.statusCode).toBe(200);
        });
    });

    describe("deleteSessions", () => {
        it("should delete multiple sessions for user", async () => {
            // Arrange
            const user = createMockUser();
            const event = createAuthenticatedEvent(user, {
                path: "/users/user-123/sessions/delete",
                body: JSON.stringify({
                    sessionIds: ["session-1", "session-2", "session-3"],
                }),
                authContext: {
                    identity: user,
                    access: {
                        type: "session", // Required for session deletion
                        ipAddress: "127.0.0.1",
                        userAgent: "test-agent/1.0",
                    },
                },
            });

            mockSessionRepository.deleteSessions.mockResolvedValue(undefined);

            // Act
            const result = await controller.deleteSessions(event);

            // Assert
            expect(mockSessionRepository.deleteSessions).toHaveBeenCalledWith({
                userId: "user-123",
                sessionIds: ["session-1", "session-2", "session-3"],
            });

            expect(result.statusCode).toBe(200);

            const responseBody = JSON.parse(result.body || "{}");
            // HAL format: properties are flat at top level
            expect(responseBody.message).toBe("Deleted 3 sessions for user user-123");
            expect(responseBody.deletedCount).toBe(3);
        });

        it("should allow user to delete their own sessions", async () => {
            // Arrange
            const user = createMockUser({ userId: "user-123", role: Role.Base });
            const event = createAuthenticatedEvent(user, {
                path: "/users/user-123/sessions/delete",
                pathParameters: { userId: "user-123" },
                body: JSON.stringify({
                    sessionIds: ["session-1"],
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

            mockSessionRepository.deleteSessions.mockResolvedValue(undefined);

            // Act
            const result = await controller.deleteSessions(event);

            // Assert
            expect(result.statusCode).toBe(200);
            expect(mockSessionRepository.deleteSessions).toHaveBeenCalledWith({
                userId: "user-123",
                sessionIds: ["session-1"],
            });
        });

        it("should throw ForbiddenError when user tries to delete other user's sessions", async () => {
            // Arrange
            const user = createMockUser({ userId: "user-123", role: Role.Base });
            const event = createAuthenticatedEvent(user, {
                path: "/users/user-456/sessions/delete",
                pathParameters: { userId: "user-456" },
                body: JSON.stringify({
                    sessionIds: ["session-1"],
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
            await expect(controller.deleteSessions(event)).rejects.toThrow(ForbiddenError);
        });

        it("should throw ForbiddenError when using API key authentication", async () => {
            // Arrange
            const user = createMockUser();
            const event = createAuthenticatedEvent(user, {
                path: "/users/user-123/sessions/delete",
                body: JSON.stringify({
                    sessionIds: ["session-1"],
                }),
                authContext: {
                    identity: user,
                    access: {
                        type: "apiKey", // API key auth not allowed for session deletion
                        ipAddress: "127.0.0.1",
                        userAgent: "test-agent/1.0",
                    },
                },
            });

            // Act & Assert
            await expect(controller.deleteSessions(event)).rejects.toThrow(ForbiddenError);
        });

        it("should allow Support role to delete any user's sessions", async () => {
            // Arrange
            const user = createMockUser({ userId: "admin-123", role: Role.Support });
            const event = createAuthenticatedEvent(user, {
                path: "/users/user-456/sessions/delete",
                pathParameters: { userId: "user-456" },
                body: JSON.stringify({
                    sessionIds: ["session-1", "session-2"],
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

            mockSessionRepository.deleteSessions.mockResolvedValue(undefined);

            // Act
            const result = await controller.deleteSessions(event);

            // Assert
            expect(result.statusCode).toBe(200);
            expect(mockSessionRepository.deleteSessions).toHaveBeenCalledWith({
                userId: "user-456",
                sessionIds: ["session-1", "session-2"],
            });
        });

        it("should handle single session deletion", async () => {
            // Arrange
            const user = createMockUser();
            const event = createAuthenticatedEvent(user, {
                path: "/users/user-123/sessions/delete",
                body: JSON.stringify({
                    sessionIds: ["session-1"],
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

            mockSessionRepository.deleteSessions.mockResolvedValue(undefined);

            // Act
            const result = await controller.deleteSessions(event);

            // Assert
            const responseBody = JSON.parse(result.body || "{}");
            // HAL format: properties are flat at top level
            expect(responseBody.message).toBe("Deleted 1 sessions for user user-123");
            expect(responseBody.deletedCount).toBe(1);
        });
    });
});
