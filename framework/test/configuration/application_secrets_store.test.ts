import { describe, expect, it, vi } from "vitest";
import { ApplicationSecretsStore } from "../../src/configuration/application_secrets_store";
import { ConfigurationStore, ConfigurationOptions } from "@houseofwolves/serverlesslaunchpad.core";
import { SecretsConfig } from "../../src/configuration/configuration_schemas";

// Mock inner store
class MockSecretsStore extends ConfigurationStore<SecretsConfig> {
    private mockData: SecretsConfig;

    constructor(mockData: SecretsConfig) {
        super();
        this.mockData = mockData;
    }

    async get(_options?: ConfigurationOptions): Promise<SecretsConfig> {
        return this.mockData;
    }
}

describe("ApplicationSecretsStore", () => {
    const mockSecretsConfig: SecretsConfig = {
        cognito: {
            client_secret: 'secret123'
        },
        session_token_salt: 'test-salt-32-characters-long!!'
    };

    it("should delegate to inner store", async () => {
        const mockInnerStore = new MockSecretsStore(mockSecretsConfig);
        const store = new ApplicationSecretsStore(mockInnerStore);

        const result = await store.get();

        expect(result).toEqual(mockSecretsConfig);
        expect(result.cognito.client_secret).toBe('secret123');
        expect(result.session_token_salt).toBe('test-salt-32-characters-long!!');
    });

    it("should pass options to inner store", async () => {
        const mockInnerStore = new MockSecretsStore(mockSecretsConfig);
        const getSpy = vi.spyOn(mockInnerStore, 'get');
        const store = new ApplicationSecretsStore(mockInnerStore);

        const options: ConfigurationOptions = { refresh: true };
        await store.get(options);

        expect(getSpy).toHaveBeenCalledWith(options);
    });

    it("should be a distinct runtime type from ConfigurationStore", () => {
        const mockInnerStore = new MockSecretsStore(mockSecretsConfig);
        const store = new ApplicationSecretsStore(mockInnerStore);

        expect(store).toBeInstanceOf(ApplicationSecretsStore);
        expect(store).toBeInstanceOf(ConfigurationStore);
        expect(store.constructor.name).toBe('ApplicationSecretsStore');
    });

    it("should handle optional fields in secrets", async () => {
        const secretsWithOptional: SecretsConfig = {
            ...mockSecretsConfig,
            encryption_key: 'optional-key',
            jwt_secret: 'jwt-secret'
        };

        const mockInnerStore = new MockSecretsStore(secretsWithOptional);
        const store = new ApplicationSecretsStore(mockInnerStore);

        const result = await store.get();

        expect(result.encryption_key).toBe('optional-key');
        expect(result.jwt_secret).toBe('jwt-secret');
    });
});