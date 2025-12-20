import { ConfigurationStore } from "@houseofwolves/serverlesslaunchpad.core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { CompositeConfigurationStore } from "../../src/configuration/composite_configuration_store";

describe("CompositeConfigurationStore", () => {
    const mockConfigSchema = z.object({
        AWS_S3_BUCKET: z.string(),
        SSK: z.string(),
    });

    type MockConfig = z.infer<typeof mockConfigSchema>;

    let compositeStore: CompositeConfigurationStore<typeof mockConfigSchema>;

    beforeEach(() => {
        compositeStore = new CompositeConfigurationStore(mockConfigSchema);
    });

    it("should return configuration from the first successful store", async () => {
        const mockConfig1: MockConfig = {
            AWS_S3_BUCKET: "bucket-1",
            SSK: "ssk-1",
        };

        const mockConfig2: MockConfig = {
            AWS_S3_BUCKET: "bucket-2",
            SSK: "ssk-2",
        };

        const store1: ConfigurationStore<MockConfig> = {
            get: vi.fn().mockResolvedValue(mockConfig1),
        };

        const store2: ConfigurationStore<MockConfig> = {
            get: vi.fn().mockResolvedValue(mockConfig2),
        };

        compositeStore.addStore(store1);
        compositeStore.addStore(store2);

        const result = await compositeStore.get();

        expect(result).toEqual(mockConfig1);
        expect(store1.get).toHaveBeenCalled();
        expect(store2.get).not.toHaveBeenCalled();
    });

    it("should fallback to second store when first fails", async () => {
        const mockConfig: MockConfig = {
            AWS_S3_BUCKET: "bucket-2",
            SSK: "ssk-2",
        };

        const store1: ConfigurationStore<MockConfig> = {
            get: vi.fn().mockRejectedValue(new Error("Store 1 failed")),
        };

        const store2: ConfigurationStore<MockConfig> = {
            get: vi.fn().mockResolvedValue(mockConfig),
        };

        compositeStore.addStore(store1);
        compositeStore.addStore(store2);

        const result = await compositeStore.get();

        expect(result).toEqual(mockConfig);
        expect(store1.get).toHaveBeenCalled();
        expect(store2.get).toHaveBeenCalled();
    });

    it("should validate configuration against schema", async () => {
        const invalidConfig = {
            AWS_S3_BUCKET: "bucket-1",
            // Missing SSK field
        };

        const store: ConfigurationStore<MockConfig> = {
            get: vi.fn().mockResolvedValue(invalidConfig),
        };

        compositeStore.addStore(store);

        await expect(compositeStore.get()).rejects.toThrow();
    });

    it("should throw error when no valid configuration found in any store", async () => {
        const store1: ConfigurationStore<MockConfig> = {
            get: vi.fn().mockRejectedValue(new Error("Store 1 failed")),
        };

        const store2: ConfigurationStore<MockConfig> = {
            get: vi.fn().mockRejectedValue(new Error("Store 2 failed")),
        };

        compositeStore.addStore(store1);
        compositeStore.addStore(store2);

        await expect(compositeStore.get()).rejects.toThrow("No valid configuration found in any store");
    });

    it("should throw error when no stores are added", async () => {
        await expect(compositeStore.get()).rejects.toThrow("No valid configuration found in any store");
    });

    it("should handle stores returning invalid schema data", async () => {
        const invalidConfig1 = {
            AWS_S3_BUCKET: 123, // Should be string
            SSK: "ssk-1",
        };

        const validConfig: MockConfig = {
            AWS_S3_BUCKET: "bucket-2",
            SSK: "ssk-2",
        };

        const store1: ConfigurationStore<MockConfig> = {
            get: vi.fn().mockResolvedValue(invalidConfig1),
        };

        const store2: ConfigurationStore<MockConfig> = {
            get: vi.fn().mockResolvedValue(validConfig),
        };

        compositeStore.addStore(store1);
        compositeStore.addStore(store2);

        const result = await compositeStore.get();

        expect(result).toEqual(validConfig);
        expect(store1.get).toHaveBeenCalled();
        expect(store2.get).toHaveBeenCalled();
    });

    it("should log warnings when stores fail", async () => {
        const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

        const mockConfig: MockConfig = {
            AWS_S3_BUCKET: "bucket-2",
            SSK: "ssk-2",
        };

        const store1: ConfigurationStore<MockConfig> = {
            get: vi.fn().mockRejectedValue(new Error("Store 1 failed")),
        };

        const store2: ConfigurationStore<MockConfig> = {
            get: vi.fn().mockResolvedValue(mockConfig),
        };

        compositeStore.addStore(store1);
        compositeStore.addStore(store2);

        await compositeStore.get();

        expect(consoleWarnSpy).toHaveBeenCalledWith("Configuration store failed:", expect.any(Error));

        consoleWarnSpy.mockRestore();
    });
});