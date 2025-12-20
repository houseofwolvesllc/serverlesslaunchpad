import type { ALBEvent, ALBResult } from "aws-lambda";
import { describe, expect, it } from "vitest";
import { AuthenticationCookieRepository } from "../../src/authentication/authentication_cookie_repository";

describe("AuthenticationCookieRepository", () => {
    const createMockEvent = (cookies?: string): ALBEvent => ({
        httpMethod: "GET",
        path: "/test",
        headers: cookies ? { cookie: cookies } : {},
        requestContext: {} as any,
        body: null,
        isBase64Encoded: false,
        queryStringParameters: undefined,
        multiValueHeaders: {},
        multiValueQueryStringParameters: undefined,
    });

    const createMockResponse = (): ALBResult => ({
        statusCode: 200,
        headers: {},
        body: "test",
    });

    describe("get", () => {
        it("should return null when no cookie header present", () => {
            // Arrange
            const event = createMockEvent();

            // Act
            const result = AuthenticationCookieRepository.get(event);

            // Assert
            expect(result).toBeNull();
        });

        it("should return null when session cookie not present", () => {
            // Arrange
            const event = createMockEvent("other_cookie=value; another=test");

            // Act
            const result = AuthenticationCookieRepository.get(event);

            // Assert
            expect(result).toBeNull();
        });

        it("should return session token when present", () => {
            // Arrange
            const event = createMockEvent("slp_session=session-token-123; other=value");

            // Act
            const result = AuthenticationCookieRepository.get(event);

            // Assert
            expect(result).toBe("session-token-123");
        });

        it("should handle case-insensitive cookie header", () => {
            // Arrange
            const event: ALBEvent = {
                httpMethod: "GET",
                path: "/test",
                headers: { Cookie: "slp_session=session-token-123" },
                requestContext: {} as any,
                body: null,
                isBase64Encoded: false,
                queryStringParameters: undefined,
                multiValueHeaders: {},
                multiValueQueryStringParameters: undefined,
            };

            // Act
            const result = AuthenticationCookieRepository.get(event);

            // Assert
            expect(result).toBe("session-token-123");
        });

        it("should parse cookie with equals sign in value", () => {
            // Arrange
            const event = createMockEvent("slp_session=token=with=equals; other=value");

            // Act
            const result = AuthenticationCookieRepository.get(event);

            // Assert
            expect(result).toBe("token=with=equals");
        });

        it("should handle multiple cookies", () => {
            // Arrange
            const event = createMockEvent("first=value1; slp_session=target-token; last=value3");

            // Act
            const result = AuthenticationCookieRepository.get(event);

            // Assert
            expect(result).toBe("target-token");
        });
    });

    describe("set", () => {
        it("should set secure cookie with all attributes", () => {
            // Arrange
            const response = createMockResponse();
            const token = "session-token-123";
            const expiresIn = 3600; // 1 hour

            // Act
            AuthenticationCookieRepository.set(response, token, expiresIn);

            // Assert
            const setCookieHeader = response.headers?.["Set-Cookie"];
            expect(setCookieHeader).toBeDefined();
            expect(setCookieHeader).toContain("slp_session=session-token-123");
            expect(setCookieHeader).toContain("Path=/");
            expect(setCookieHeader).toContain("HttpOnly");
            expect(setCookieHeader).toContain("Secure");
            expect(setCookieHeader).toContain("SameSite=Lax");
            expect(setCookieHeader).toMatch(/Expires=\w+, \d{2} \w+ \d{4} \d{2}:\d{2}:\d{2} GMT/);
        });

        it("should create headers object if not present", () => {
            // Arrange
            const response: ALBResult = {
                statusCode: 200,
                body: "test",
            };
            const token = "session-token-123";
            const expiresIn = 3600;

            // Act
            AuthenticationCookieRepository.set(response, token, expiresIn);

            // Assert
            expect(response.headers).toBeDefined();
            expect(response.headers?.["Set-Cookie"]).toBeDefined();
        });

        it("should calculate correct expiration date", () => {
            // Arrange
            const response = createMockResponse();
            const token = "session-token-123";
            const expiresIn = 3600; // 1 hour
            const beforeTime = Date.now();

            // Act
            AuthenticationCookieRepository.set(response, token, expiresIn);

            // Assert
            const setCookieHeader = response.headers?.["Set-Cookie"];
            const expiresMatch = setCookieHeader?.toString().match(/Expires=(.+?);/);
            expect(expiresMatch).toBeTruthy();

            if (expiresMatch) {
                const expiresDate = new Date(expiresMatch[1]);
                const expectedTime = beforeTime + expiresIn * 1000;
                const tolerance = 1000; // 1 second tolerance

                expect(Math.abs(expiresDate.getTime() - expectedTime)).toBeLessThan(tolerance);
            }
        });
    });

    describe("remove", () => {
        it("should set expired cookie to remove it", () => {
            // Arrange
            const response = createMockResponse();

            // Act
            AuthenticationCookieRepository.remove(response);

            // Assert
            const setCookieHeader = response.headers?.["Set-Cookie"];
            expect(setCookieHeader).toBeDefined();
            expect(setCookieHeader).toContain("slp_session=;");
            expect(setCookieHeader).toContain("Path=/");
            expect(setCookieHeader).toContain("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
            expect(setCookieHeader).toContain("HttpOnly");
            expect(setCookieHeader).toContain("Secure");
            expect(setCookieHeader).toContain("SameSite=Lax");
        });

        it("should create headers object if not present", () => {
            // Arrange
            const response: ALBResult = {
                statusCode: 200,
                body: "test",
            };

            // Act
            AuthenticationCookieRepository.remove(response);

            // Assert
            expect(response.headers).toBeDefined();
            expect(response.headers?.["Set-Cookie"]).toBeDefined();
        });
    });

    describe("cookie parsing edge cases", () => {
        it("should handle cookies with spaces", () => {
            // Arrange
            const event = createMockEvent(" slp_session = session-token-123 ; other = value ");

            // Act
            const result = AuthenticationCookieRepository.get(event);

            // Assert
            expect(result).toBe("session-token-123");
        });

        it("should handle empty cookie values", () => {
            // Arrange
            const event = createMockEvent("empty=; slp_session=valid-token; another=");

            // Act
            const result = AuthenticationCookieRepository.get(event);

            // Assert
            expect(result).toBe("valid-token");
        });

        it("should handle malformed cookies gracefully", () => {
            // Arrange
            const event = createMockEvent("malformed; slp_session=valid-token; =noname");

            // Act
            const result = AuthenticationCookieRepository.get(event);

            // Assert
            expect(result).toBe("valid-token");
        });
    });

    describe("cookie domain", () => {
        it("should include domain when initialized with domain", () => {
            // Arrange
            AuthenticationCookieRepository.initialize(".serverlesslaunchpad.com");
            const response = createMockResponse();
            const token = "session-token-123";
            const expiresIn = 3600;

            // Act
            AuthenticationCookieRepository.set(response, token, expiresIn);

            // Assert
            const setCookieHeader = response.headers?.["Set-Cookie"];
            expect(setCookieHeader).toContain("Domain=.serverlesslaunchpad.com");

            // Cleanup
            AuthenticationCookieRepository.initialize(undefined);
        });

        it("should not include domain when not initialized", () => {
            // Arrange
            AuthenticationCookieRepository.initialize(undefined);
            const response = createMockResponse();
            const token = "session-token-123";
            const expiresIn = 3600;

            // Act
            AuthenticationCookieRepository.set(response, token, expiresIn);

            // Assert
            const setCookieHeader = response.headers?.["Set-Cookie"];
            expect(setCookieHeader).not.toContain("Domain=");
        });

        it("should include domain in removal cookie when initialized", () => {
            // Arrange
            AuthenticationCookieRepository.initialize(".example.com");
            const response = createMockResponse();

            // Act
            AuthenticationCookieRepository.remove(response);

            // Assert
            const setCookieHeader = response.headers?.["Set-Cookie"];
            expect(setCookieHeader).toContain("Domain=.example.com");

            // Cleanup
            AuthenticationCookieRepository.initialize(undefined);
        });
    });

    describe("security attributes", () => {
        it("should include all required security attributes", () => {
            // Arrange
            const response = createMockResponse();
            const token = "session-token-123";
            const expiresIn = 3600;

            // Act
            AuthenticationCookieRepository.set(response, token, expiresIn);

            // Assert
            const setCookieHeader = response.headers?.["Set-Cookie"];

            // Check all security attributes are present
            expect(setCookieHeader).toContain("HttpOnly"); // Prevents XSS
            expect(setCookieHeader).toContain("Secure"); // HTTPS only
            expect(setCookieHeader).toContain("SameSite=Lax"); // CSRF protection for cross-site POSTs, allows top-level navigation
            expect(setCookieHeader).toContain("Path=/"); // Proper scope
        });

        it("should use correct cookie name", () => {
            // Arrange
            const response = createMockResponse();
            const token = "session-token-123";
            const expiresIn = 3600;

            // Act
            AuthenticationCookieRepository.set(response, token, expiresIn);

            // Assert
            const setCookieHeader = response.headers?.["Set-Cookie"];
            expect(setCookieHeader).toMatch(/^slp_session=/);
        });
    });
});
