import { mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { FileConfigurationStore } from "../../src/configuration/file_configuration_store";

describe("FileConfigurationStore", () => {
    const mockConfigSchema = z.object({
        AWS_S3_BUCKET: z.string(),
        SSK: z.string(),
    });

    const mockConfig = {
        AWS_S3_BUCKET: "test-bucket",
        SSK: "test-ssk",
    };

    const defaultConfigName = "serverlesslaunchpad.com.config.json";

    let tempDir: string;
    let store: FileConfigurationStore<typeof mockConfigSchema>;

    beforeEach(async () => {
        // Create temporary directory for test files
        tempDir = await mkdtemp(path.join(tmpdir(), "file-config-store-test-"));
    });

    afterEach(async () => {
        // Clean up temporary directory
        await rm(tempDir, { recursive: true, force: true });
    });

    describe("with explicit configuration name", () => {
        beforeEach(() => {
            store = new FileConfigurationStore(mockConfigSchema, tempDir, defaultConfigName);
        });

        it("should read and parse configuration from specified file", async () => {
            const configPath = path.join(tempDir, defaultConfigName);
            await writeFile(configPath, JSON.stringify(mockConfig));

            const result = await store.get();

            expect(result.AWS_S3_BUCKET).toBe(mockConfig.AWS_S3_BUCKET);
            expect(result.SSK).toBe(mockConfig.SSK);
        });

        it("should throw error when file does not exist", async () => {
            await expect(store.get()).rejects.toThrow(/ENOENT/);
        });
    });

    describe("with custom configuration name", () => {
        const customConfigName = "custom-config.json";

        beforeEach(() => {
            store = new FileConfigurationStore(mockConfigSchema, tempDir, customConfigName);
        });

        it("should read configuration from custom named file", async () => {
            const configPath = path.join(tempDir, customConfigName);
            await writeFile(configPath, JSON.stringify(mockConfig));

            const result = await store.get();

            expect(result.AWS_S3_BUCKET).toBe(mockConfig.AWS_S3_BUCKET);
            expect(result.SSK).toBe(mockConfig.SSK);
        });
    });

    it("should throw error for invalid JSON in file", async () => {
        store = new FileConfigurationStore(mockConfigSchema, tempDir, defaultConfigName);
        const configPath = path.join(tempDir, defaultConfigName);
        await writeFile(configPath, "invalid-json");

        await expect(store.get()).rejects.toThrow(/Unexpected token/);
    });

    it("should throw error when configuration does not match schema", async () => {
        store = new FileConfigurationStore(mockConfigSchema, tempDir, defaultConfigName);
        const configPath = path.join(tempDir, defaultConfigName);
        const invalidConfig = {
            AWS_S3_BUCKET: "test-bucket",
            // Missing SSK field
        };
        await writeFile(configPath, JSON.stringify(invalidConfig));

        await expect(store.get()).rejects.toThrow();
    });

    it("should throw error when configuration has invalid types", async () => {
        store = new FileConfigurationStore(mockConfigSchema, tempDir, defaultConfigName);
        const configPath = path.join(tempDir, defaultConfigName);
        const invalidConfig = {
            AWS_S3_BUCKET: 123, // Should be string
            SSK: "test-ssk",
        };
        await writeFile(configPath, JSON.stringify(invalidConfig));

        await expect(store.get()).rejects.toThrow();
    });

    it("should handle deeply nested configuration paths", async () => {
        const nestedPath = path.join(tempDir, "config", "nested", "deep");
        const nestedConfigName = "app.config.json";
        
        // Create nested directory structure
        const { mkdir } = await import("fs/promises");
        await mkdir(nestedPath, { recursive: true });

        store = new FileConfigurationStore(mockConfigSchema, nestedPath, nestedConfigName);
        
        const configPath = path.join(nestedPath, nestedConfigName);
        await writeFile(configPath, JSON.stringify(mockConfig));

        const result = await store.get();

        expect(result.AWS_S3_BUCKET).toBe(mockConfig.AWS_S3_BUCKET);
        expect(result.SSK).toBe(mockConfig.SSK);
    });

    it("should handle file with empty JSON object", async () => {
        store = new FileConfigurationStore(mockConfigSchema, tempDir, defaultConfigName);
        const configPath = path.join(tempDir, defaultConfigName);
        await writeFile(configPath, JSON.stringify({}));

        await expect(store.get()).rejects.toThrow();
    });

    it("should handle file with null content", async () => {
        store = new FileConfigurationStore(mockConfigSchema, tempDir, defaultConfigName);
        const configPath = path.join(tempDir, defaultConfigName);
        await writeFile(configPath, JSON.stringify(null));

        await expect(store.get()).rejects.toThrow();
    });
});