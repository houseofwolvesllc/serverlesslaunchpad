import type { ApiKey } from "@houseofwolves/serverlesslaunchpad.core";
import { describe, expect, it } from "vitest";

describe("API Keys", () => {
    const createMockApiKey = (overrides?: Partial<ApiKey>): ApiKey => ({
        id: "key-123",
        userId: "user-123",
        name: "Test API Key",
        key: "test_key_abc123xyz789",
        prefix: "test_",
        suffix: "xyz789",
        scopes: ["read:users", "write:users"],
        expiresAt: new Date("2025-01-01T00:00:00Z"),
        lastUsedAt: new Date("2024-07-01T00:00:00Z"),
        createdAt: new Date("2024-01-01T00:00:00Z"),
        isActive: true,
        ...overrides,
    });

    describe("API Key Creation", () => {
        it("should create API key with default values", () => {
            const apiKey = createMockApiKey();

            expect(apiKey.id).toBe("key-123");
            expect(apiKey.userId).toBe("user-123");
            expect(apiKey.name).toBe("Test API Key");
            expect(apiKey.key).toBe("test_key_abc123xyz789");
            expect(apiKey.isActive).toBe(true);
            expect(apiKey.scopes).toEqual(["read:users", "write:users"]);
        });

        it("should create API key with overrides", () => {
            const apiKey = createMockApiKey({
                id: "custom-key",
                name: "Custom Key",
                isActive: false,
                scopes: ["read:*"],
            });

            expect(apiKey.id).toBe("custom-key");
            expect(apiKey.name).toBe("Custom Key");
            expect(apiKey.isActive).toBe(false);
            expect(apiKey.scopes).toEqual(["read:*"]);
        });
    });

    describe("API Key Validation", () => {
        it("should validate active API key", () => {
            const apiKey = createMockApiKey({ isActive: true });
            expect(apiKey.isActive).toBe(true);
        });

        it("should validate inactive API key", () => {
            const apiKey = createMockApiKey({ isActive: false });
            expect(apiKey.isActive).toBe(false);
        });

        it("should check if API key is expired", () => {
            const expiredKey = createMockApiKey({
                expiresAt: new Date("2023-01-01T00:00:00Z"),
            });
            const activeKey = createMockApiKey({
                expiresAt: new Date("2025-01-01T00:00:00Z"),
            });

            expect(expiredKey.expiresAt.getTime() < Date.now()).toBe(true);
            expect(activeKey.expiresAt.getTime() > Date.now()).toBe(true);
        });
    });

    describe("API Key Formatting", () => {
        it("should mask API key for display", () => {
            const apiKey = createMockApiKey();
            const masked = `${apiKey.prefix}${"*".repeat(8)}${apiKey.suffix}`;
            
            expect(masked).toBe("test_********xyz789");
            expect(masked).not.toContain("abc123");
        });

        it("should validate API key format", () => {
            const apiKey = createMockApiKey();
            const keyFormat = /^[a-z]+_[a-zA-Z0-9]+$/;
            
            expect(keyFormat.test(apiKey.key)).toBe(true);
            expect(apiKey.key.startsWith(apiKey.prefix)).toBe(true);
            expect(apiKey.key.endsWith(apiKey.suffix)).toBe(true);
        });
    });
});