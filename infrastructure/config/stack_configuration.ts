import { Environment } from "@houseofwolves/serverlesslaunchpad.core";
import { z } from "zod";

/**
 * Stack configuration schema
 */
export const StackConfigurationSchema = z.object({
    environment: z.nativeEnum(Environment),

    // API Lambda configuration
    api: z.object({
        memory: z.number().min(128).max(10240),
        timeout: z.number().min(1).max(900), // seconds
        logRetention: z.number().min(1).max(3653), // days
        reservedConcurrentExecutions: z.number().optional(),
    }),

    // ALB configuration
    alb: z.object({
        certificateArn: z.string().optional(),
        domainName: z.string().optional(),
        healthCheckPath: z.string().default("/health"),
        healthCheckInterval: z.number().default(30),
        idleTimeout: z.number().default(60),
    }),

    // Athena configuration
    athena: z.object({
        workGroupName: z.string(),
        resultsBucketRetention: z.number().min(1), // days
        enforceWorkGroupConfiguration: z.boolean().default(true),
        publishCloudWatchMetrics: z.boolean().default(true),
    }),

    // Secrets configuration
    secrets: z.object({
        secretName: z.string(),
        rotationDays: z.number().optional(),
        kmsKeyAlias: z.string().optional(),
    }),

    // Tags to apply to all resources
    tags: z.record(z.string()).default({}),
});

export type StackConfiguration = z.infer<typeof StackConfigurationSchema>;

/**
 * Environment-specific configurations
 */
export const configurations: Record<
    Environment,
    {
        api?: Partial<StackConfiguration["api"]>;
        alb?: Partial<StackConfiguration["alb"]>;
        athena?: Partial<StackConfiguration["athena"]>;
        secrets?: Partial<StackConfiguration["secrets"]>;
        tags?: Partial<StackConfiguration["tags"]>;
    }
> = {
    development: {
        // Uses defaults from getConfiguration function
    },

    staging: {
        api: {
            memory: 1024,
            timeout: 60,
            logRetention: 30,
        },
    },

    production: {
        api: {
            memory: 2048,
            timeout: 120,
            logRetention: 365,
            reservedConcurrentExecutions: 100,
        },
        secrets: {
            rotationDays: 90,
            kmsKeyAlias: "alias/serverlesslaunchpad-production",
        },
    },
};

/**
 * Get configuration for a specific environment
 */
export function getConfiguration(environment: Environment): StackConfiguration {
    const envConfig = configurations[environment];

    const config: StackConfiguration = {
        environment,
        api: {
            memory: 512,
            timeout: 30,
            logRetention: 7,
            ...envConfig.api,
        },
        alb: {
            healthCheckPath: "/health",
            healthCheckInterval: 30,
            idleTimeout: 60,
            ...envConfig.alb,
        },
        athena: {
            workGroupName: `serverlesslaunchpad_workgroup_${environment}`,
            resultsBucketRetention: environment === "production" ? 365 : environment === "staging" ? 30 : 7,
            enforceWorkGroupConfiguration: true,
            publishCloudWatchMetrics: true,
            ...envConfig.athena,
        },
        secrets: {
            secretName: `serverlesslaunchpad/${environment}`,
            ...envConfig.secrets,
        },
        tags: {
            Environment: environment,
            Project: "ServerlessLaunchpad",
            ManagedBy: "CDK",
            ...envConfig.tags,
        },
    };

    // Validate configuration
    return StackConfigurationSchema.parse(config);
}
