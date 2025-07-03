import { execSync } from "child_process";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

export interface InfrastructureOutputs {
    // Cognito
    userPoolId: string;
    userPoolClientId: string;
    userPoolProviderUrl: string;

    // Athena
    athenaWorkgroup: string;
    athenaResultsBucket: string;

    // ALB
    loadBalancerDnsName: string;
    loadBalancerArn: string;

    // VPC (optional)
    vpcId?: string;
}

export interface EnvironmentConfig {
    environment: string;
    cognito: {
        user_pool_id: string;
        user_pool_client_id: string;
        user_pool_provider_url: string;
    };
    athena: {
        workgroup: string;
        results_bucket: string;
    };
    alb: {
        dns_name: string;
        arn: string;
    };
    vpc?: {
        id: string;
    };
    features: {
        enable_analytics: boolean;
        enable_rate_limiting: boolean;
        enable_advanced_security: boolean;
    };
    limits: {
        max_api_keys_per_user: number;
        session_timeout_hours: number;
        max_query_timeout_seconds: number;
    };
}

export class ConfigGenerator {
    /**
     * Generates environment-specific configuration file from infrastructure outputs
     */
    static async generateConfig(environment: string, outputs: InfrastructureOutputs): Promise<void> {
        const configDir = path.join(__dirname, "../../config");
        const configFile = path.join(configDir, `${environment}.config.json`);

        // Ensure config directory exists
        await mkdir(configDir, { recursive: true });

        const config: EnvironmentConfig = {
            environment,
            cognito: {
                user_pool_id: outputs.userPoolId,
                user_pool_client_id: outputs.userPoolClientId,
                user_pool_provider_url: outputs.userPoolProviderUrl,
            },
            athena: {
                workgroup: outputs.athenaWorkgroup,
                results_bucket: outputs.athenaResultsBucket,
            },
            alb: {
                dns_name: outputs.loadBalancerDnsName,
                arn: outputs.loadBalancerArn,
            },
            ...(outputs.vpcId && {
                vpc: {
                    id: outputs.vpcId,
                },
            }),
            features: this.getEnvironmentFeatures(environment),
            limits: this.getEnvironmentLimits(environment),
        };

        await writeFile(configFile, JSON.stringify(config, null, 2));

        console.log(`📝 Generated configuration file: ${configFile}`);
    }

    /**
     * Extracts infrastructure outputs from CDK stack exports
     */
    static async getInfrastructureOutputs(environment: string): Promise<InfrastructureOutputs> {
        try {
            // Get CDK outputs using AWS CLI
            const command = `aws cloudformation describe-stacks --region ${
                process.env.AWS_DEFAULT_REGION || "us-east-1"
            } --query "Stacks[?contains(StackName, '${environment}')].Outputs" --output json`;

            const result = execSync(command, { encoding: "utf-8" });
            const stackOutputs = JSON.parse(result);

            // Flatten all outputs from all stacks
            const outputs: Record<string, string> = {};
            for (const stackOutput of stackOutputs) {
                if (Array.isArray(stackOutput)) {
                    for (const output of stackOutput) {
                        outputs[output.OutputKey] = output.OutputValue;
                    }
                }
            }

            return {
                userPoolId: this.getRequiredOutput(
                    outputs,
                    `serverlesslaunchpad-cognito-stack-${environment}-UserPoolId`,
                    environment
                ),
                userPoolClientId: this.getRequiredOutput(
                    outputs,
                    `serverlesslaunchpad-cognito-stack-${environment}-UserPoolClientId`,
                    environment
                ),
                userPoolProviderUrl: this.getRequiredOutput(
                    outputs,
                    `serverlesslaunchpad-cognito-stack-${environment}-UserPoolProviderUrl`,
                    environment
                ),
                athenaWorkgroup: this.getRequiredOutput(
                    outputs,
                    `serverlesslaunchpad-data-stack-${environment}-WorkGroupName`,
                    environment
                ),
                athenaResultsBucket: this.getRequiredOutput(
                    outputs,
                    `serverlesslaunchpad-data-stack-${environment}-QueryResultsBucketName`,
                    environment
                ),
                loadBalancerDnsName: this.getRequiredOutput(
                    outputs,
                    `serverlesslaunchpad-alb-stack-${environment}-LoadBalancerDnsName`,
                    environment
                ),
                loadBalancerArn: this.getRequiredOutput(
                    outputs,
                    `serverlesslaunchpad-alb-stack-${environment}-LoadBalancerArn`,
                    environment
                ),
                vpcId: outputs[`serverlesslaunchpad-alb-stack-${environment}-VpcId`], // Optional
            };
        } catch (error) {
            throw new Error(`Failed to get infrastructure outputs for ${environment}: ${error}`);
        }
    }

    /**
     * Gets environment-specific feature flags
     */
    private static getEnvironmentFeatures(environment: string): EnvironmentConfig["features"] {
        switch (environment) {
            case "development":
                return {
                    enable_analytics: false,
                    enable_rate_limiting: false,
                    enable_advanced_security: false,
                };
            case "staging":
                return {
                    enable_analytics: true,
                    enable_rate_limiting: true,
                    enable_advanced_security: false,
                };
            case "production":
                return {
                    enable_analytics: true,
                    enable_rate_limiting: true,
                    enable_advanced_security: true,
                };
            default:
                throw new Error(`Unknown environment: ${environment}`);
        }
    }

    /**
     * Gets environment-specific limits
     */
    private static getEnvironmentLimits(environment: string): EnvironmentConfig["limits"] {
        switch (environment) {
            case "development":
                return {
                    max_api_keys_per_user: 10,
                    session_timeout_hours: 24,
                    max_query_timeout_seconds: 300, // 5 minutes
                };
            case "staging":
                return {
                    max_api_keys_per_user: 5,
                    session_timeout_hours: 12,
                    max_query_timeout_seconds: 180, // 3 minutes
                };
            case "production":
                return {
                    max_api_keys_per_user: 3,
                    session_timeout_hours: 8,
                    max_query_timeout_seconds: 120, // 2 minutes
                };
            default:
                throw new Error(`Unknown environment: ${environment}`);
        }
    }

    /**
     * Helper to get required output with better error messages
     */
    private static getRequiredOutput(outputs: Record<string, string>, key: string, environment: string): string {
        const value = outputs[key];
        if (!value) {
            throw new Error(
                `Missing required output '${key}' for environment '${environment}'. Available outputs: ${Object.keys(
                    outputs
                ).join(", ")}`
            );
        }
        return value;
    }
}
