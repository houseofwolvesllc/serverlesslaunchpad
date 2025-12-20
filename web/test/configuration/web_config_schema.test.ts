import { describe, expect, it } from "vitest";
import { WebConfigSchema, WebConfig } from "../../src/configuration/web_config_schema";

describe("WebConfigSchema", () => {
    const validConfig: WebConfig = {
        environment: 'local',
        aws: {
            region: 'us-west-2'
        },
        cognito: {
            user_pool_id: 'us-west-2_test123',
            client_id: 'client123',
            identity_pool_id: 'us-west-2:identity123'
        },
        api: {
            base_url: 'http://localhost:3001',
            timeout: 30000
        },
        features: {
            enable_mfa: false,
            enable_analytics: false,
            enable_notifications: true,
            enable_advanced_security: false,
            mock_auth: false,
            debug_mode: true,
            enable_logging: true,
            hot_reload: true
        }
    };

    it("should validate a complete valid configuration", () => {
        const result = WebConfigSchema.safeParse(validConfig);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.environment).toBe('local');
            expect(result.data.cognito.user_pool_id).toBe('us-west-2_test123');
            expect(result.data.api.base_url).toBe('http://localhost:3001');
        }
    });

    it("should not include sensitive fields", () => {
        // Attempt to parse a config that includes sensitive data
        const configWithSecrets = {
            ...validConfig,
            cognito: {
                ...validConfig.cognito,
                client_secret: 'should-not-be-included'
            },
            session_token_salt: 'should-not-be-included'
        };

        // The schema should parse successfully but won't include the sensitive fields
        const result = WebConfigSchema.safeParse(configWithSecrets);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data).not.toHaveProperty('client_secret');
            expect(result.data).not.toHaveProperty('session_token_salt');
        }
    });

    it("should require required fields", () => {
        const incompleteConfig = {
            environment: 'local'
            // Missing required fields
        };

        const result = WebConfigSchema.safeParse(incompleteConfig);
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues.length).toBeGreaterThan(0);
        }
    });

    it("should apply default values for optional feature flags", () => {
        const minimalConfig = {
            environment: 'local',
            aws: {
                region: 'us-west-2'
            },
            cognito: {
                user_pool_id: 'test-pool',
                client_id: 'test-client'
            },
            api: {
                base_url: 'http://localhost:3001'
            },
            features: {} // Empty features object
        };

        const result = WebConfigSchema.safeParse(minimalConfig);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.features.enable_mfa).toBe(false);
            expect(result.data.features.enable_analytics).toBe(false);
            expect(result.data.features.enable_notifications).toBe(false);
            expect(result.data.api.timeout).toBe(30000); // Default timeout
        }
    });

    it("should validate environment enum values", () => {
        const invalidEnvConfig = {
            ...validConfig,
            environment: 'invalid-env'
        };

        const result = WebConfigSchema.safeParse(invalidEnvConfig);
        expect(result.success).toBe(false);
    });

    it("should accept all valid environment values", () => {
        const environments = ['local', 'development', 'staging', 'production'] as const;

        for (const env of environments) {
            const config = {
                ...validConfig,
                environment: env
            };

            const result = WebConfigSchema.safeParse(config);
            expect(result.success).toBe(true, `Environment ${env} should be valid`);
        }
    });
});