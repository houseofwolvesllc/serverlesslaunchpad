import { z } from 'zod';

/**
 * Configuration schema for Web frontend service.
 * This schema defines only the configuration fields that the Web frontend needs,
 * excluding any sensitive data that should remain in the API service only.
 */
export const WebConfigSchema = z.object({
    environment: z.enum(['local', 'development', 'staging', 'production']),

    // AWS configuration (minimal for frontend)
    aws: z.object({
        region: z.string(),
        // Note: endpoint_url excluded - frontend doesn't directly call AWS services
    }),

    // Cognito configuration - public fields only, no client_secret
    cognito: z.object({
        user_pool_id: z.string(),
        client_id: z.string(),
        identity_pool_id: z.string().optional(),
        user_pool_provider_url: z.string().optional(),
        // Note: client_secret explicitly excluded - never exposed to frontend
    }),

    // API configuration
    api: z.object({
        base_url: z.string(),
        timeout: z.number().default(30000),
    }),

    // Feature flags for frontend behavior
    features: z.object({
        enable_mfa: z.boolean().default(false),
        enable_analytics: z.boolean().default(false),
        enable_notifications: z.boolean().default(false),
        enable_advanced_security: z.boolean().default(false),
        mock_auth: z.boolean().default(false),
        debug_mode: z.boolean().default(false),
        enable_logging: z.boolean().default(false),
        hot_reload: z.boolean().default(false),
    }),

    // S3 configuration for frontend uploads (if needed)
    s3: z
        .object({
            upload_bucket: z.string().optional(),
            static_bucket: z.string().optional(),
        })
        .optional(),

    // ALB configuration (for API endpoint construction)
    alb: z
        .object({
            dns_name: z.string().optional(),
        })
        .optional(),

    // Development/debugging configuration
    development: z
        .object({
            moto_url: z.string().optional(),
            node_env: z.string().default('development'),
        })
        .optional(),

    // Metadata
    _generated: z.string().optional(),
    _source: z.string().optional(),
});

export type WebConfig = z.infer<typeof WebConfigSchema>;

/**
 * Maps configuration to Vite environment variables format for backward compatibility
 * during the migration period.
 */
export const createViteEnvConfig = (config: WebConfig) => ({
    VITE_API_URL: config.api.base_url,
    VITE_API_TIMEOUT: config.api.timeout.toString(),
    VITE_AWS_REGION: config.aws.region,
    VITE_COGNITO_USER_POOL_ID: config.cognito.user_pool_id,
    VITE_COGNITO_CLIENT_ID: config.cognito.client_id,
    VITE_COGNITO_IDENTITY_POOL_ID: config.cognito.identity_pool_id || '',
    VITE_FEATURE_MFA: config.features.enable_mfa.toString(),
    VITE_FEATURE_ANALYTICS: config.features.enable_analytics.toString(),
    VITE_FEATURE_NOTIFICATIONS: config.features.enable_notifications.toString(),
    VITE_MOCK_AUTH: config.features.mock_auth.toString(),
    VITE_DEBUG_MODE: config.features.debug_mode.toString(),
    VITE_ENABLE_LOGGING: config.features.enable_logging.toString(),
    VITE_HOT_RELOAD: config.features.hot_reload.toString(),
    VITE_NODE_ENV: config.development?.node_env || 'development',
    VITE_MOTO_URL: config.development?.moto_url || '',
    VITE_S3_UPLOAD_BUCKET: config.s3?.upload_bucket || '',
    VITE_S3_STATIC_BUCKET: config.s3?.static_bucket || '',
});

/**
 * Type for the legacy Vite environment variables format.
 */
export type ViteEnvConfig = ReturnType<typeof createViteEnvConfig>;
