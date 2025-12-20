import { z } from "zod";

/**
 * Configuration schema for infrastructure settings.
 * Contains only non-sensitive configuration data that can be cached indefinitely.
 */
export const ApiConfigSchema = z.object({
    environment: z.enum(["moto", "development", "staging", "production"]),

    // AWS configuration
    aws: z.object({
        region: z.string(),
        endpoint_url: z.string().optional(), // For local/Moto development
    }),

    // Cognito configuration (non-sensitive)
    cognito: z.object({
        user_pool_id: z.string(),
        client_id: z.string(),
        user_pool_provider_url: z.string().optional(),
        endpoint_url: z.string().optional(), // For local/cognito-local development
    }),

    // Lambda configuration
    lambda: z
        .object({
            function_name: z.string().optional(),
            function_arn: z.string().optional(),
        })
        .optional(),

    // ALB configuration
    alb: z
        .object({
            target_group_arn: z.string().optional(),
            dns_name: z.string().optional(),
        })
        .optional(),

    // Secrets configuration
    secrets: z
        .object({
            configuration_secret_arn: z.string().optional(),
        })
        .optional(),

    // Feature flags
    features: z
        .object({
            enable_analytics: z.boolean().default(false),
            enable_rate_limiting: z.boolean().default(false),
            enable_advanced_security: z.boolean().default(false),
        })
        .optional(),

    // System limits
    limits: z
        .object({
            max_api_keys_per_user: z.number().default(10),
            session_timeout_hours: z.number().default(24),
            max_query_timeout_seconds: z.number().default(300),
        })
        .optional(),

    // CORS configuration
    cors: z
        .object({
            allowed_origin_suffix: z.string().optional(), // e.g., ".serverlesslaunchpad.com"
        })
        .optional(),

    // Metadata
    _generated: z.string().optional(),
    _source: z.string().optional(),
});

/**
 * Configuration schema for sensitive application secrets.
 * Contains only sensitive data that should be cached for a limited time (15 minutes).
 */
export const SecretsConfigSchema = z.object({
    // Session token salt for signature generation
    session_token_salt: z.string(),
});

export type ApiConfig = z.infer<typeof ApiConfigSchema>;
export type SecretsConfig = z.infer<typeof SecretsConfigSchema>;
