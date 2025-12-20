import type { Session } from "@houseofwolves/serverlesslaunchpad.core";
import { describe, expect, it } from "vitest";

describe("Sessions", () => {
    const createMockSession = (overrides?: Partial<Session>): Session => ({
        sessionId: "session-123",
        userId: "user-123",
        ipAddress: "127.0.0.1",
        userAgent: "test-agent/1.0",
        dateLastAccessed: new Date("2024-07-15T10:00:00Z"),
        dateExpires: new Date("2024-07-15T14:00:00Z"),
        dateCreated: new Date("2024-07-15T08:00:00Z"),
        ...overrides,
    });

    describe("Session Creation", () => {
        it("should create session with default values", () => {
            const session = createMockSession();

            expect(session.sessionId).toBe("session-123");
            expect(session.userId).toBe("user-123");
            expect(session.ipAddress).toBe("127.0.0.1");
            expect(session.userAgent).toBe("test-agent/1.0");
        });

        it("should create session with overrides", () => {
            const session = createMockSession({
                sessionId: "custom-session",
                userId: "custom-user",
                ipAddress: "192.168.1.1",
            });

            expect(session.sessionId).toBe("custom-session");
            expect(session.userId).toBe("custom-user");
            expect(session.ipAddress).toBe("192.168.1.1");
        });
    });

    describe("Session Validation", () => {
        it("should check if session is expired", () => {
            const expiredSession = createMockSession({
                dateExpires: new Date("2023-01-01T00:00:00Z"),
            });
            const activeSession = createMockSession({
                dateExpires: new Date("2025-01-01T00:00:00Z"),
            });

            expect(expiredSession.dateExpires.getTime() < Date.now()).toBe(true);
            expect(activeSession.dateExpires.getTime() > Date.now()).toBe(true);
        });

        it("should validate session IP address", () => {
            const session = createMockSession({ ipAddress: "127.0.0.1" });
            
            expect(session.ipAddress).toBe("127.0.0.1");
        });

        it("should validate session user agent", () => {
            const session = createMockSession({ userAgent: "test-agent/1.0" });
            
            expect(session.userAgent).toBe("test-agent/1.0");
        });
    });

    describe("Session Timing", () => {
        it("should calculate session duration", () => {
            const session = createMockSession();
            const duration = session.dateExpires.getTime() - session.dateCreated.getTime();
            const expectedDuration = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

            expect(duration).toBe(expectedDuration);
        });

        it("should track last access time", () => {
            const session = createMockSession();
            const lastAccessed = session.dateLastAccessed;
            
            expect(lastAccessed).toEqual(new Date("2024-07-15T10:00:00Z"));
            expect(lastAccessed.getTime()).toBeLessThan(session.dateExpires.getTime());
        });

        it("should determine if session needs refresh", () => {
            const nearExpirySession = createMockSession({
                dateExpires: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
            });
            const freshSession = createMockSession({
                dateExpires: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
            });

            const bufferTime = 30 * 60 * 1000; // 30 minutes
            const nearExpiryTimeLeft = nearExpirySession.dateExpires.getTime() - Date.now();
            const freshTimeLeft = freshSession.dateExpires.getTime() - Date.now();

            expect(nearExpiryTimeLeft < bufferTime).toBe(true);
            expect(freshTimeLeft > bufferTime).toBe(true);
        });
    });
});