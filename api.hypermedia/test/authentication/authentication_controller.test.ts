import { Features, Role, User } from "@houseofwolves/serverlesslaunchpad.core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthenticationController } from "../../src/authentication/authentication_controller";
import { UnauthorizedError } from "../../src/errors";
import { ExtendedALBEvent } from "../../src/extended_alb_event";

// Mock the cookie repository
vi.mock("../../src/authentication/authentication_cookie_repository", () => ({
    AuthenticationCookieRepository: {
        set: vi.fn(),
        remove: vi.fn(),
        get: vi.fn(),
    },
}));

describe("AuthenticationController", () => {
    let controller: AuthenticationController;
    let mockAuthenticator: any;

    const createMockUser = (): User => ({
        userId: "user-123",
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
        role: Role.Support,
        features: Features.Contacts | Features.Campaigns,
        dateCreated: new Date("2024-01-01T00:00:00Z"),
        dateModified: new Date("2024-01-01T00:00:00Z"),
    });

    const createSigninEvent = (overrides?: Partial<ExtendedALBEvent>): ExtendedALBEvent =>
        ({
            httpMethod: "POST",
            path: "/signin",
            headers: {
                authorization: "Bearer test-jwt-token",
                "user-agent": "test-agent/1.0",
                "x-forwarded-for": "127.0.0.1",
                accept: "application/json",
            },
            requestContext: {} as any,
            body: JSON.stringify({
                sessionKey: "test-session-key",
                email: "test@example.com",
                firstName: "Test",
                lastName: "User",
            }),
            isBase64Encoded: false,
            queryStringParameters: undefined,
            multiValueHeaders: {},
            multiValueQueryStringParameters: undefined,
            ...overrides,
        } as ExtendedALBEvent);

    const createSignoutEvent = (overrides?: Partial<ExtendedALBEvent>): ExtendedALBEvent =>
        ({
            httpMethod: "POST",
            path: "/signout",
            headers: {
                authorization: "SessionToken session-token-123",
                "user-agent": "test-agent/1.0",
                "x-forwarded-for": "127.0.0.1",
            },
            requestContext: {} as any,
            body: null,
            isBase64Encoded: false,
            queryStringParameters: undefined,
            multiValueHeaders: {},
            multiValueQueryStringParameters: undefined,
            ...overrides,
        } as ExtendedALBEvent);

    beforeEach(() => {
        mockAuthenticator = {
            authenticate: vi.fn(),
            revoke: vi.fn(),
        } as any;

        controller = new AuthenticationController(mockAuthenticator);

        // Clear mock calls from previous tests
        vi.clearAllMocks();
    });

    describe("authenticate", () => {
        it("should authenticate user with valid credentials", async () => {
            // Arrange
            const user = createMockUser();
            const event = createSigninEvent();

            const mockAuthResult = {
                authContext: {
                    identity: user,
                    access: {
                        type: "session" as const,
                        sessionToken: "session-token-123",
                        dateExpires: new Date("2024-12-31T23:59:59Z"),
                    },
                },
            };

            mockAuthenticator.authenticate.mockResolvedValue(mockAuthResult);

            // Act
            const result = await controller.authenticate(event);

            // Assert
            expect(mockAuthenticator.authenticate).toHaveBeenCalledWith({
                accessToken: "test-jwt-token",
                ipAddress: "127.0.0.1",
                userAgent: "test-agent/1.0",
                sessionKey: "test-session-key",
                email: "test@example.com",
                firstName: "Test",
                lastName: "User",
            });

            expect(result.statusCode).toBe(200);

            const responseBody = JSON.parse(result.body || "{}");
            expect(responseBody.properties.user.userId).toBe("user-123");
            expect(responseBody.properties.links).toContainEqual({
                rel: ["self"],
                href: "/users/user-123",
            });
        });

        it("should throw UnauthorizedError when authentication fails", async () => {
            // Arrange
            const event = createSigninEvent();

            const mockAuthResult = {
                authContext: {
                    identity: null,
                },
            };

            mockAuthenticator.authenticate.mockResolvedValue(mockAuthResult);

            // Act & Assert
            await expect(controller.authenticate(event)).rejects.toThrow(UnauthorizedError);
            await expect(controller.authenticate(event)).rejects.toThrow("Bearer failed validation.");
        });

        it("should set authentication cookie for HTML clients", async () => {
            // Arrange
            const user = createMockUser();
            const event = createSigninEvent({
                headers: {
                    authorization: "Bearer test-jwt-token",
                    "user-agent": "test-agent/1.0",
                    "x-forwarded-for": "127.0.0.1",
                    accept: "text/html,application/xhtml+xml",
                },
            });

            const mockAuthResult = {
                authContext: {
                    identity: user,
                    access: {
                        type: "session" as const,
                        sessionToken: "session-token-123",
                        dateExpires: new Date("2024-12-31T23:59:59Z"),
                    },
                },
            };

            mockAuthenticator.authenticate.mockResolvedValue(mockAuthResult);

            const { AuthenticationCookieRepository } = await import(
                "../../src/authentication/authentication_cookie_repository"
            );

            // Act
            await controller.authenticate(event);

            // Assert
            expect(AuthenticationCookieRepository.set).toHaveBeenCalledWith(
                expect.any(Object),
                "session-token-123",
                expect.any(Number)
            );
        });

        it("should not set authentication cookie for JSON clients", async () => {
            // Arrange
            const user = createMockUser();
            const event = createSigninEvent(); // Default has accept: application/json

            const mockAuthResult = {
                authContext: {
                    identity: user,
                    access: {
                        type: "session" as const,
                        sessionToken: "session-token-123",
                        dateExpires: new Date("2024-12-31T23:59:59Z"),
                    },
                },
            };

            mockAuthenticator.authenticate.mockResolvedValue(mockAuthResult);

            const { AuthenticationCookieRepository } = await import(
                "../../src/authentication/authentication_cookie_repository"
            );

            // Act
            await controller.authenticate(event);
            console.log("HEADERS", event.headers);
            // Assert
            expect(AuthenticationCookieRepository.set).not.toHaveBeenCalled();
        });

        it("should build user links with sessions and api-keys", async () => {
            // Arrange
            const user = createMockUser();
            const event = createSigninEvent();

            const mockAuthResult = {
                authContext: {
                    identity: user,
                    access: {
                        type: "session" as const,
                        sessionToken: "session-token-123",
                        dateExpires: new Date("2024-12-31T23:59:59Z"),
                    },
                },
            };

            mockAuthenticator.authenticate.mockResolvedValue(mockAuthResult);

            // Act
            const result = await controller.authenticate(event);

            // Assert
            const responseBody = JSON.parse(result.body || "{}");
            const links = responseBody.properties.links;

            expect(links).toContainEqual({
                rel: ["self"],
                href: "/users/user-123",
            });
            expect(links).toContainEqual({
                rel: ["sessions"],
                href: "/users/user-123/sessions/",
            });
            expect(links).toContainEqual({
                rel: ["api-keys"],
                href: "/users/user-123/api_keys/",
            });
        });
    });

    describe("signout", () => {
        it("should revoke session and clear cookie", async () => {
            // Arrange
            const event = createSignoutEvent();
            mockAuthenticator.revoke.mockResolvedValue(undefined);

            const { AuthenticationCookieRepository } = await import(
                "../../src/authentication/authentication_cookie_repository"
            );

            // Act
            const result = await controller.signout(event);

            // Assert
            expect(mockAuthenticator.revoke).toHaveBeenCalledWith({
                sessionToken: "session-token-123",
                ipAddress: "127.0.0.1",
                userAgent: "test-agent/1.0",
            });

            expect(AuthenticationCookieRepository.remove).toHaveBeenCalledWith(result);
            expect(result.statusCode).toBe(200);
        });
    });

    describe("shouldSetAuthCookie", () => {
        it("should return true for text/html accept header", async () => {
            // Arrange
            const user = createMockUser();
            const event = createSigninEvent({
                headers: {
                    authorization: "Bearer test-jwt-token",
                    "user-agent": "test-agent/1.0",
                    "x-forwarded-for": "127.0.0.1",
                    accept: "text/html",
                },
            });

            const mockAuthResult = {
                authContext: {
                    identity: user,
                    access: {
                        type: "session" as const,
                        sessionToken: "session-token-123",
                        dateExpires: new Date("2024-12-31T23:59:59Z"),
                    },
                },
            };

            mockAuthenticator.authenticate.mockResolvedValue(mockAuthResult);

            const { AuthenticationCookieRepository } = await import(
                "../../src/authentication/authentication_cookie_repository"
            );

            // Act
            await controller.authenticate(event);

            // Assert
            expect(AuthenticationCookieRepository.set).toHaveBeenCalled();
        });

        it("should return true for application/xhtml+xml accept header", async () => {
            // Arrange
            const user = createMockUser();
            const event = createSigninEvent({
                headers: {
                    authorization: "Bearer test-jwt-token",
                    "user-agent": "test-agent/1.0",
                    "x-forwarded-for": "127.0.0.1",
                    accept: "application/xhtml+xml",
                },
            });

            const mockAuthResult = {
                authContext: {
                    identity: user,
                    access: {
                        type: "session" as const,
                        sessionToken: "session-token-123",
                        dateExpires: new Date("2024-12-31T23:59:59Z"),
                    },
                },
            };

            mockAuthenticator.authenticate.mockResolvedValue(mockAuthResult);

            const { AuthenticationCookieRepository } = await import(
                "../../src/authentication/authentication_cookie_repository"
            );

            // Act
            await controller.authenticate(event);

            // Assert
            expect(AuthenticationCookieRepository.set).toHaveBeenCalled();
        });
    });
});
