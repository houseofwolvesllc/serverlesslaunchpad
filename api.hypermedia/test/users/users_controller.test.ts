// Mock AWS Secrets Manager BEFORE any imports to ensure the mock is in place when container initializes
import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { mockClient } from "aws-sdk-client-mock";

const mockSecretsManagerClient = mockClient(SecretsManagerClient);
mockSecretsManagerClient.on(GetSecretValueCommand).resolves({
    SecretString: JSON.stringify({
        cognito: {
            client_secret: "test-client-secret",
        },
        session_token_salt: "test-session-token-salt-for-testing-purposes-only",
    }),
});

// Now import everything else
import { describe, it, expect, beforeEach, vi } from "vitest";
import { User, Role, Features, UserRepository, Authenticator } from "@houseofwolves/serverlesslaunchpad.core";
import { UsersController } from "../../src/users/users_controller";
import { NotFoundError } from "../../src/errors";
import { AuthenticatedALBEvent } from "../../src/extended_alb_event";
import { getContainer } from "../../src/container";
import "../../src/index.js"; // Register Router in container

describe("UsersController", () => {
    let controller: UsersController;
    let mockUserRepository: any;
    let mockRouter: any;

    const createMockUser = (overrides?: Partial<User>): User => ({
        userId: "user-123",
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
        role: Role.Base,
        features: Features.Contacts | Features.Campaigns,
        dateCreated: new Date("2024-01-01T00:00:00Z"),
        dateModified: new Date("2024-01-01T00:00:00Z"),
        ...overrides
    });

    // Store current event's authContext to be returned by mock authenticator
    let currentEventAuthContext: any = null;

    const createAuthenticatedEvent = (overrides?: Partial<AuthenticatedALBEvent>): AuthenticatedALBEvent => {
        const user = overrides?.authContext?.identity || createMockUser({
            userId: "current-user",
            role: Role.AccountManager
        });

        const authContext = overrides?.authContext || {
            identity: user,
            access: {
                type: "session" as const,
                sessionToken: "test-token",
                dateExpires: new Date("2024-12-31T23:59:59Z"),
                ipAddress: "127.0.0.1",
                userAgent: "test-agent/1.0",
            }
        };

        // Set the authContext for the mock authenticator to return
        currentEventAuthContext = authContext;

        return {
            httpMethod: "GET",
            path: `/users/${overrides?.pathParameters?.userId || "user-123"}`,
            headers: {
                Authorization: "SessionToken test-token",
                Accept: "application/hal+json",
                "user-agent": "test-agent/1.0",
                "x-forwarded-for": "127.0.0.1",
            },
            pathParameters: {
                userId: "user-123",
                ...overrides?.pathParameters
            },
            requestContext: {} as any,
            body: null,
            isBase64Encoded: false,
            queryStringParameters: undefined,
            multiValueHeaders: {},
            multiValueQueryStringParameters: undefined,
            authContext,
            ...overrides,
        } as AuthenticatedALBEvent;
    };

    beforeEach(() => {
        // Get container and set up mocks
        const container = getContainer();

        // Mock Authenticator to return the authContext from the event
        // This allows tests to specify custom users/roles via createAuthenticatedEvent
        const mockAuthenticator = {
            verify: vi.fn().mockImplementation(async ({ sessionToken }) => {
                // Return the authContext that was set on the current event
                // This allows tests to control the authenticated user
                if (sessionToken === "test-token" && currentEventAuthContext) {
                    return { authContext: currentEventAuthContext };
                }
                return { authContext: { identity: null } };
            }),
            authenticate: vi.fn(),
            revoke: vi.fn(),
        };

        // Bind mock authenticator (replace existing binding)
        container.bind(Authenticator, { factory: () => mockAuthenticator as any, replace: true }).asSingleton();

        mockUserRepository = {
            getUserById: vi.fn(),
            getUserByEmail: vi.fn(),
            upsertUser: vi.fn(),
        };

        // Bind mock UserRepository (replace existing binding)
        container.bind(UserRepository, { factory: () => mockUserRepository as any, replace: true }).asSingleton();

        mockRouter = {
            buildHref: vi.fn((controller, method, params) => {
                if (method === "getUser") return `/users/${params.userId}`;
                if (method === "getSessions") return `/users/${params.userId}/sessions/list`;
                if (method === "getApiKeys") return `/users/${params.userId}/api-keys/list`;
                return "/";
            }),
        };

        // Resolve controller from container so decorators work properly
        controller = container.resolve(UsersController);

        vi.clearAllMocks();
    });

    describe("getUser", () => {
        it("should return user when found and authorized as AccountManager", async () => {
            const user = createMockUser();
            mockUserRepository.getUserById.mockResolvedValue(user);

            const event = createAuthenticatedEvent({
                pathParameters: { userId: user.userId },
                authContext: {
                    identity: createMockUser({
                        userId: "admin-user",
                        role: Role.AccountManager
                    }),
                    access: {
                        type: "session",
                        sessionToken: "test-token",
                        dateExpires: new Date("2024-12-31T23:59:59Z"),
                        ipAddress: "127.0.0.1",
                        userAgent: "test-agent/1.0",
                    }
                }
            });

            const result = await controller.getUser(event);

            expect(result.statusCode).toBe(200);
            expect(mockUserRepository.getUserById).toHaveBeenCalledWith({
                userId: user.userId
            });

            const body = JSON.parse(result.body || "{}");
            expect(body.userId).toBe(user.userId);
            expect(body.email).toBe(user.email);
            expect(body._links.self.href).toBe(`/users/${user.userId}`);
        });

        it("should allow owner to access their own profile", async () => {
            const user = createMockUser({ userId: "owner-123", role: Role.Base });
            mockUserRepository.getUserById.mockResolvedValue(user);

            const event = createAuthenticatedEvent({
                pathParameters: { userId: user.userId },
                authContext: {
                    identity: user, // Same user
                    access: {
                        type: "session",
                        sessionToken: "test-token",
                        dateExpires: new Date("2024-12-31T23:59:59Z"),
                        ipAddress: "127.0.0.1",
                        userAgent: "test-agent/1.0",
                    }
                }
            });

            const result = await controller.getUser(event);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body || "{}");
            expect(body.userId).toBe(user.userId);
        });

        it("should throw NotFoundError when user doesn't exist", async () => {
            mockUserRepository.getUserById.mockResolvedValue(undefined);

            const event = createAuthenticatedEvent({
                pathParameters: { userId: "nonexistent" },
                authContext: {
                    identity: createMockUser({
                        userId: "admin-user",
                        role: Role.AccountManager
                    }),
                    access: {
                        type: "session",
                        sessionToken: "test-token",
                        dateExpires: new Date("2024-12-31T23:59:59Z"),
                        ipAddress: "127.0.0.1",
                        userAgent: "test-agent/1.0",
                    }
                }
            });

            await expect(controller.getUser(event)).rejects.toThrow(NotFoundError);
            await expect(controller.getUser(event)).rejects.toThrow("User nonexistent not found");
        });

        it("should deny access for Base role trying to access other users", async () => {
            const targetUser = createMockUser({ userId: "target-user" });
            const currentUser = createMockUser({ userId: "other-user", role: Role.Base });

            mockUserRepository.getUserById.mockResolvedValue(targetUser);

            const event = createAuthenticatedEvent({
                pathParameters: { userId: targetUser.userId },
                authContext: {
                    identity: currentUser,
                    access: {
                        type: "session",
                        sessionToken: "test-token",
                        dateExpires: new Date("2024-12-31T23:59:59Z"),
                        ipAddress: "127.0.0.1",
                        userAgent: "test-agent/1.0",
                    }
                }
            });

            await expect(controller.getUser(event)).rejects.toThrow();
        });

        it("should deny access for Support role (requires AccountManager)", async () => {
            const targetUser = createMockUser({ userId: "target-user" });
            const currentUser = createMockUser({ userId: "support-user", role: Role.Support });

            mockUserRepository.getUserById.mockResolvedValue(targetUser);

            const event = createAuthenticatedEvent({
                pathParameters: { userId: targetUser.userId },
                authContext: {
                    identity: currentUser,
                    access: {
                        type: "session",
                        sessionToken: "test-token",
                        dateExpires: new Date("2024-12-31T23:59:59Z"),
                        ipAddress: "127.0.0.1",
                        userAgent: "test-agent/1.0",
                    }
                }
            });

            await expect(controller.getUser(event)).rejects.toThrow();
        });

        it("should allow Admin role to access any user profile", async () => {
            const targetUser = createMockUser({ userId: "target-user" });
            const adminUser = createMockUser({ userId: "admin-user", role: Role.Admin });

            mockUserRepository.getUserById.mockResolvedValue(targetUser);

            const event = createAuthenticatedEvent({
                pathParameters: { userId: targetUser.userId },
                authContext: {
                    identity: adminUser,
                    access: {
                        type: "session",
                        sessionToken: "test-token",
                        dateExpires: new Date("2024-12-31T23:59:59Z"),
                        ipAddress: "127.0.0.1",
                        userAgent: "test-agent/1.0",
                    }
                }
            });

            const result = await controller.getUser(event);

            expect(result.statusCode).toBe(200);
        });

        it("should include HAL templates for sessions and api-keys", async () => {
            const user = createMockUser();
            mockUserRepository.getUserById.mockResolvedValue(user);

            const event = createAuthenticatedEvent({
                pathParameters: { userId: user.userId },
                authContext: {
                    identity: createMockUser({
                        userId: "admin-user",
                        role: Role.AccountManager
                    }),
                    access: {
                        type: "session",
                        sessionToken: "test-token",
                        dateExpires: new Date("2024-12-31T23:59:59Z"),
                        ipAddress: "127.0.0.1",
                        userAgent: "test-agent/1.0",
                    }
                }
            });

            const result = await controller.getUser(event);

            const body = JSON.parse(result.body || "{}");
            expect(body._templates.sessions).toBeDefined();
            expect(body._templates.sessions.method).toBe("POST");
            expect(body._templates["api-keys"]).toBeDefined();
            expect(body._templates["api-keys"].method).toBe("POST");
        });

        it("should call getUserById with correct parameters", async () => {
            const user = createMockUser({ userId: "specific-user-id" });
            mockUserRepository.getUserById.mockResolvedValue(user);

            const event = createAuthenticatedEvent({
                pathParameters: { userId: "specific-user-id" },
                authContext: {
                    identity: createMockUser({
                        userId: "admin-user",
                        role: Role.AccountManager
                    }),
                    access: {
                        type: "session",
                        sessionToken: "test-token",
                        dateExpires: new Date("2024-12-31T23:59:59Z"),
                        ipAddress: "127.0.0.1",
                        userAgent: "test-agent/1.0",
                    }
                }
            });

            await controller.getUser(event);

            expect(mockUserRepository.getUserById).toHaveBeenCalledWith({
                userId: "specific-user-id"
            });
        });

        it("should return HAL+JSON with correct content type", async () => {
            const user = createMockUser();
            mockUserRepository.getUserById.mockResolvedValue(user);

            const event = createAuthenticatedEvent({
                pathParameters: { userId: user.userId },
                authContext: {
                    identity: createMockUser({
                        userId: "admin-user",
                        role: Role.AccountManager
                    }),
                    access: {
                        type: "session",
                        sessionToken: "test-token",
                        dateExpires: new Date("2024-12-31T23:59:59Z"),
                        ipAddress: "127.0.0.1",
                        userAgent: "test-agent/1.0",
                    }
                }
            });

            const result = await controller.getUser(event);

            expect(result.headers?.["Content-Type"]).toContain("application/hal+json");
        });
    });
});
