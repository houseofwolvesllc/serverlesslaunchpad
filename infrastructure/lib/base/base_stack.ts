import { Environment } from "@houseofwolves/serverlesslaunchpad.core";
import { RemovalPolicy, Stack, StackProps, Tags } from "aws-cdk-lib";
import { Construct } from "constructs";
import { StackConfiguration } from "../../config/stack_configuration";

export interface BaseStackProps extends StackProps {
    configuration: StackConfiguration;
    description?: string;
}

/**
 * Base stack with common configuration and utilities
 */
export abstract class BaseStack extends Stack {
    protected readonly configuration: StackConfiguration;
    public readonly environment: Environment;

    constructor(scope: Construct, id: string, props: BaseStackProps) {
        super(scope, id, props);

        this.configuration = props.configuration;
        this.environment = props.configuration.environment;

        // Apply tags to all resources in this stack
        Object.entries(props.configuration.tags).forEach(([key, value]) => {
            Tags.of(this).add(key, value);
        });

        // Set termination protection for production
        if (this.environment === "production") {
            this.terminationProtection = true;
        }
    }

    /**
     * Get removal policy based on environment
     */
    protected getRemovalPolicy(): RemovalPolicy {
        return this.environment === "production" ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY;
    }

    /**
     * Generate a resource name with environment suffix
     */
    protected resourceName(baseName: string): string {
        return `serverlesslaunchpad_${baseName}_${this.environment}`;
    }

    /**
     * Generate a construct ID with project prefix
     */
    protected constructId(baseName: string): string {
        return `serverlesslaunchpad_${baseName}`;
    }

    /**
     * Generate a stack-specific resource name
     */
    protected stackResourceName(baseName: string): string {
        const stackName = this.stackName
            .toLowerCase()
            .replace("serverlesslaunchpad_", "")
            .replace("_stack", "")
            .replace(`_${this.environment}`, "");

        return `serverlesslaunchpad_${stackName}_${baseName}_${this.environment}`;
    }

    /**
     * Check if this is a production environment
     */
    protected isProduction(): boolean {
        return this.environment === "production";
    }

    /**
     * Check if this is a development environment
     */
    protected isDevelopment(): boolean {
        return this.environment === "development";
    }

    /**
     * Check if this is a staging environment
     */
    protected isStaging(): boolean {
        return this.environment === "staging";
    }
}
