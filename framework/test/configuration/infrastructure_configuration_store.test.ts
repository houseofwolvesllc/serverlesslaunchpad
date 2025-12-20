import { describe, expect, it, vi } from "vitest";
import { InfrastructureConfigurationStore } from "../../src/configuration/infrastructure_configuration_store";
import { ConfigurationStore, ConfigurationOptions } from "@houseofwolves/serverlesslaunchpad.core";
import { ApiConfig } from "../../src/configuration/configuration_schemas";

// Mock inner store
class MockConfigurationStore extends ConfigurationStore<ApiConfig> {
    private mockData: ApiConfig;

    constructor(mockData: ApiConfig) {
        super();
        this.mockData = mockData;
    }

    async get(_options?: ConfigurationOptions): Promise<ApiConfig> {
        return this.mockData;
    }
}

describe("InfrastructureConfigurationStore", () => {
    const mockApiConfig: ApiConfig = {
        environment: 'local',
        aws: {
            region: 'us-west-2',
            endpoint_url: 'http://localhost:5555'
        },
        cognito: {
            user_pool_id: 'us-west-2_test123',
            client_id: 'client123'
        },
        athena: {
            workgroup: 'test-workgroup',
            data_bucket: 'test-data-bucket',
            results_bucket: 'test-results-bucket'
        }
    };

    it("should delegate to inner store", async () => {
        const mockInnerStore = new MockConfigurationStore(mockApiConfig);
        const store = new InfrastructureConfigurationStore(mockInnerStore);

        const result = await store.get();

        expect(result).toEqual(mockApiConfig);
        expect(result.environment).toBe('local');
        expect(result.cognito.user_pool_id).toBe('us-west-2_test123');
    });

    it("should pass options to inner store", async () => {
        const mockInnerStore = new MockConfigurationStore(mockApiConfig);
        const getSpy = vi.spyOn(mockInnerStore, 'get');
        const store = new InfrastructureConfigurationStore(mockInnerStore);

        const options: ConfigurationOptions = { refresh: true };
        await store.get(options);

        expect(getSpy).toHaveBeenCalledWith(options);
    });

    it("should be a distinct runtime type from ConfigurationStore", () => {
        const mockInnerStore = new MockConfigurationStore(mockApiConfig);
        const store = new InfrastructureConfigurationStore(mockInnerStore);

        expect(store).toBeInstanceOf(InfrastructureConfigurationStore);
        expect(store).toBeInstanceOf(ConfigurationStore);
        expect(store.constructor.name).toBe('InfrastructureConfigurationStore');
    });
});