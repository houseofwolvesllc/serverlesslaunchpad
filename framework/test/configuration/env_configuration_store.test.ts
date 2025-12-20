import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { EnvConfigurationStore } from "../../src/configuration/env_configuration_store";

describe("EnvConfigurationStore", () => {
    const mockConfigurationName = "TEST_APP_CONFIG";
    const mockConfig = {
        AWS_S3_BUCKET: "test-bucket",
        SSK: "test-ssk",
    };
    const mockConfigJson = JSON.stringify(mockConfig);
    const mockConfigSchema = z.object({
        AWS_S3_BUCKET: z.string(),
        SSK: z.string(),
    });

    let originalEnv: NodeJS.ProcessEnv;
    let store: EnvConfigurationStore<typeof mockConfigSchema>;

    beforeEach(() => {
        // Save original process.env
        originalEnv = { ...process.env };

        // Set up test environment
        process.env[mockConfigurationName] = mockConfigJson;
        store = new EnvConfigurationStore(mockConfigSchema, mockConfigurationName);
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it("should retrieve and parse configuration from environment variables", async () => {
        const config = await store.get();

        expect(config.AWS_S3_BUCKET).toBe(mockConfig.AWS_S3_BUCKET);
        expect(config.SSK).toBe(mockConfig.SSK);
    });

    it("should throw an error when environment variable is missing", async () => {
        delete process.env[mockConfigurationName];
        await expect(async () => await store.get()).rejects.toThrow(new SyntaxError("Unexpected end of JSON input"));
    });

    it("should throw an error for invalid JSON in environment variable", async () => {
        process.env[mockConfigurationName] = "invalid-json";
        await expect(async () => await store.get()).rejects.toThrow(
            new SyntaxError(`Unexpected token 'i', "invalid-json" is not valid JSON`)
        );
    });
});
