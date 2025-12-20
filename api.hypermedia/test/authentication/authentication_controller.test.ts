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
        isSet: vi.fn().mockReturnValue(false),
    },
}));

describe("AuthenticationController", () => {
    let controller: AuthenticationController;
    let mockAuthenticator: any;
    let mockRouter: any;

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

        mockRouter = {
            buildHref: vi.fn((controller, method, params) => {
                // Mock simple URL building for tests
                if (method === 'federate') return '/auth/federate';
                if (method === 'verify') return '/auth/verify';
                if (method === 'revoke') return '/auth/revoke';
                if (method === 'getSessions') return `/users/${params.userId}/sessions/list`;
                if (method === 'getApiKeys') return `/users/${params.userId}/api-keys/list`;
                return '/';
            }),
        } as any;

        controller = new AuthenticationController(mockAuthenticator, mockRouter);

        // Clear mock calls from previous tests
        vi.clearAllMocks();
    });

    describe("federate", () => {
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
                        ipAddress: "127.0.0.1",
                        userAgent: "test-agent/1.0",
                    },
                },
            };

            mockAuthenticator.authenticate.mockResolvedValue(mockAuthResult);

            // Act
            const result = await controller.federate(event);

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
            // HAL format: user properties are at top level (user is the main resource)
            expect(responseBody.userId).toBe("user-123");
            expect(responseBody.email).toBe("test@example.com");
            expect(responseBody.firstName).toBe("Test");
            expect(responseBody.lastName).toBe("User");

            // HAL uses _links object, not links array
            expect(responseBody._links).toHaveProperty("self");
            expect(responseBody._links.self.href).toBe("/users/user-123");

            // Sessions and API Keys are templates (POST operations)
            expect(responseBody._templates).toHaveProperty("sessions");
            expect(responseBody._templates).toHaveProperty("api-keys");

            // Base navigation links automatically injected
            expect(responseBody._links).toHaveProperty("home");
            expect(responseBody._links.home.href).toBe("/");
            expect(responseBody._links).toHaveProperty("sitemap");
            expect(responseBody._links.sitemap.href).toBe("/sitemap");

            // HAL-FORMS templates for actions
            expect(responseBody._templates).toHaveProperty("verify");
            expect(responseBody._templates.verify.method).toBe("POST");
            expect(responseBody._templates.verify.target).toBe("/auth/verify");
            expect(responseBody._templates).toHaveProperty("revoke");
            expect(responseBody._templates.revoke.method).toBe("POST");
            expect(responseBody._templates.revoke.target).toBe("/auth/revoke");

            // Embedded access information
            expect(responseBody._embedded).toHaveProperty("access");
            expect(responseBody._embedded.access.type).toBe("session");
            expect(responseBody._embedded.access.ipAddress).toBeDefined();
            expect(responseBody._embedded.access.userAgent).toBeDefined();
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
            await expect(controller.federate(event)).rejects.toThrow(UnauthorizedError);
            await expect(controller.federate(event)).rejects.toThrow("Bearer failed validation.");
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
            await controller.federate(event);

            // Assert - sessionToken is sessionKey + userId
            expect(AuthenticationCookieRepository.set).toHaveBeenCalledWith(
                expect.any(Object),
                "test-session-keyuser-123", // sessionKey + userId
                expect.any(Number)
            );
        });

        it("should set authentication cookie for JSON clients (supports web SPAs)", async () => {
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
            await controller.federate(event);

            // Assert - Web SPAs using JSON need cookies for secure session management
            expect(AuthenticationCookieRepository.set).toHaveBeenCalledWith(
                expect.any(Object), // response object
                "test-session-keyuser-123", // sessionKey + userId
                expect.any(Number) // expiry timestamp
            );
        });

        it("should build user links with sessions and api-keys templates", async () => {
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
            const result = await controller.federate(event);

            // Assert
            const responseBody = JSON.parse(result.body || "{}");

            // User self link
            expect(responseBody._links.self.href).toBe("/users/user-123");

            // Sessions and API Keys are templates (POST operations)
            expect(responseBody._templates).toHaveProperty("sessions");
            expect(responseBody._templates.sessions.method).toBe("POST");
            expect(responseBody._templates.sessions.target).toBe("/users/user-123/sessions/list");

            expect(responseBody._templates).toHaveProperty("api-keys");
            expect(responseBody._templates["api-keys"].method).toBe("POST");
            expect(responseBody._templates["api-keys"].target).toBe("/users/user-123/api-keys/list");
        });
    });

    describe("revoke", () => {
        it("should revoke session and clear cookie", async () => {
            // Arrange
            const event = createSignoutEvent();
            mockAuthenticator.revoke.mockResolvedValue(undefined);

            const { AuthenticationCookieRepository } = await import(
                "../../src/authentication/authentication_cookie_repository"
            );

            // Act
            const result = await controller.revoke(event);

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
            await controller.federate(event);

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
            await controller.federate(event);

            // Assert
            expect(AuthenticationCookieRepository.set).toHaveBeenCalled();
        });
    });
});
