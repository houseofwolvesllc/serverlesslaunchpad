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
        endpoint_url: z.string().optional(), // For local development with cognito-local
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

    // Metadata
    _generated: z.string().optional(),
    _source: z.string().optional(),
});

export type WebConfig = z.infer<typeof WebConfigSchema>;
