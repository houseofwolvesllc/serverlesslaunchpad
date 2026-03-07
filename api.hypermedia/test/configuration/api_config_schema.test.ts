import { describe, expect, it } from "vitest";
import { ApiConfigSchema, ApiConfig, SecretsConfigSchema, SecretsConfig } from "../../src/configuration/api_config_schema";

describe("ApiConfigSchema", () => {
    const validConfig: ApiConfig = {
        environment: 'local',
        aws: {
            region: 'us-west-2',
            endpoint_url: 'http://localhost:5555'
        },
        cognito: {
            user_pool_id: 'us-west-2_test123',
            client_id: 'client123'
        }
    };

    it("should validate a complete valid configuration", () => {
        const result = ApiConfigSchema.safeParse(validConfig);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.environment).toBe('local');
            expect(result.data.cognito.user_pool_id).toBe('us-west-2_test123');
        }
    });

    it("should require required fields", () => {
        const incompleteConfig = {
            environment: 'local',
            // Missing required fields
        };

        const result = ApiConfigSchema.safeParse(incompleteConfig);
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues.length).toBeGreaterThan(0);
        }
    });

    it("should allow optional fields to be undefined", () => {
        const minimalConfig = {
            environment: 'local',
            aws: {
                region: 'us-west-2'
            },
            cognito: {
                user_pool_id: 'test-pool',
                client_id: 'test-client'
            }
        };

        const result = ApiConfigSchema.safeParse(minimalConfig);
        expect(result.success).toBe(true);
    });

    it("should validate environment enum values", () => {
        const invalidEnvConfig = {
            ...validConfig,
            environment: 'invalid-env'
        };

        const result = ApiConfigSchema.safeParse(invalidEnvConfig);
        expect(result.success).toBe(false);
    });

    it("should accept all valid environment values", () => {
        const environments = ['local', 'development', 'staging', 'production'] as const;

        for (const env of environments) {
            const config = {
                ...validConfig,
                environment: env
            };

            const result = ApiConfigSchema.safeParse(config);
            expect(result.success, `Environment ${env} should be valid`).toBe(true);
        }
    });
});

describe("SecretsConfigSchema", () => {
    const validSecrets: SecretsConfig = {
        session_token_salt: 'test-salt-32-characters-long!!'
    };

    it("should validate valid secrets configuration", () => {
        const result = SecretsConfigSchema.safeParse(validSecrets);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.session_token_salt).toBe('test-salt-32-characters-long!!');
        }
    });

    it("should require session_token_salt", () => {
        const incompleteSecrets = {};

        const result = SecretsConfigSchema.safeParse(incompleteSecrets);
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues.some(issue => issue.path.includes('session_token_salt'))).toBe(true);
        }
    });
});