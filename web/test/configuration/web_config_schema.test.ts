import { describe, expect, it } from "vitest";
import { WebConfigSchema, createViteEnvConfig, WebConfig } from "../../src/configuration/web_config_schema";

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
            session_token_salt: 'should-not-be-included',
            athena: {
                workgroup: 'should-not-be-included',
                data_bucket: 'should-not-be-included',
                results_bucket: 'should-not-be-included'
            }
        };

        // The schema should parse successfully but won't include the sensitive fields
        const result = WebConfigSchema.safeParse(configWithSecrets);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data).not.toHaveProperty('client_secret');
            expect(result.data).not.toHaveProperty('session_token_salt');
            expect(result.data).not.toHaveProperty('athena');
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

describe("createViteEnvConfig", () => {
    it("should transform web config to Vite environment variables format", () => {
        const webConfig: WebConfig = {
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
                enable_mfa: true,
                enable_analytics: false,
                enable_notifications: true,
                enable_advanced_security: false,
                mock_auth: false,
                debug_mode: true,
                enable_logging: true,
                hot_reload: true
            },
            development: {
                moto_url: 'http://localhost:5555',
                node_env: 'development'
            }
        };

        const viteEnvConfig = createViteEnvConfig(webConfig);

        expect(viteEnvConfig).toEqual({
            VITE_API_URL: 'http://localhost:3001',
            VITE_API_TIMEOUT: '30000',
            VITE_AWS_REGION: 'us-west-2',
            VITE_COGNITO_USER_POOL_ID: 'us-west-2_test123',
            VITE_COGNITO_CLIENT_ID: 'client123',
            VITE_COGNITO_IDENTITY_POOL_ID: 'us-west-2:identity123',
            VITE_FEATURE_MFA: 'true',
            VITE_FEATURE_ANALYTICS: 'false',
            VITE_FEATURE_NOTIFICATIONS: 'true',
            VITE_MOCK_AUTH: 'false',
            VITE_DEBUG_MODE: 'true',
            VITE_ENABLE_LOGGING: 'true',
            VITE_HOT_RELOAD: 'true',
            VITE_NODE_ENV: 'development',
            VITE_MOTO_URL: 'http://localhost:5555',
            VITE_S3_UPLOAD_BUCKET: '',
            VITE_S3_STATIC_BUCKET: ''
        });
    });

    it("should handle missing optional fields gracefully", () => {
        const minimalWebConfig: WebConfig = {
            environment: 'production',
            aws: {
                region: 'us-east-1'
            },
            cognito: {
                user_pool_id: 'us-east-1_prod123',
                client_id: 'prod-client123'
            },
            api: {
                base_url: 'https://api.example.com',
                timeout: 30000
            },
            features: {
                enable_mfa: true,
                enable_analytics: true,
                enable_notifications: false,
                enable_advanced_security: true,
                mock_auth: false,
                debug_mode: false,
                enable_logging: false,
                hot_reload: false
            }
        };

        const viteEnvConfig = createViteEnvConfig(minimalWebConfig);

        expect(viteEnvConfig.VITE_API_URL).toBe('https://api.example.com');
        expect(viteEnvConfig.VITE_COGNITO_IDENTITY_POOL_ID).toBe('');
        expect(viteEnvConfig.VITE_MOTO_URL).toBe('');
        expect(viteEnvConfig.VITE_NODE_ENV).toBe('development'); // Default
    });
});