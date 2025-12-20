#!/usr/bin/env node
import { Environment } from "@houseofwolves/serverlesslaunchpad.core";
import { App, Tags } from "aws-cdk-lib";
import "source-map-support/register";
import { getConfiguration } from "../config/stack_configuration";
import { AlbStack } from "../lib/alb/alb_stack";
import { CognitoStack } from "../lib/auth/cognito_stack";
import { DynamoDbStack } from "../lib/data/dynamodb_stack";
import { ApiLambdaStack } from "../lib/lambda/api_lambda_stack";
import { NetworkStack } from "../lib/network/network_stack";
import { SecretsStack } from "../lib/secrets/secrets_stack";
import { WebStaticHostingStack, WebPackageName } from "../lib/web/web_static_hosting_stack";

// Get environment variables - use NODE_ENV as single source of truth
const environment = (process.env.NODE_ENV || "development") as Environment;

// AWS Profile is required - CDK will resolve account/region from profile
if (!process.env.AWS_PROFILE) {
    throw new Error("AWS_PROFILE environment variable is required. Set it to your AWS profile name.");
}

// For VPC lookups, CDK needs explicit account/region
const account = process.env.AWS_ACCOUNT_ID || process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.AWS_REGION || process.env.CDK_DEFAULT_REGION;

// Ensure account and region are set
if (!account || !region) {
    console.error("❌ Error: Account and region must be set for CDK deployment");
    console.error("Current values:");
    console.error(`  Account: ${account || 'undefined'}`);
    console.error(`  Region: ${region || 'undefined'}`);
    console.error("Please ensure AWS_ACCOUNT_ID and AWS_REGION are set by the deployment script");
    process.exit(1);
}

// Get configuration for environment
const configuration = getConfiguration(environment);

// Get VPC configuration from environment
// Default to using the default VPC unless specified otherwise
const vpcConfig = process.env.VPC_CONFIG
    ? {
          type: process.env.VPC_CONFIG as "default" | "custom" | "existing",
          vpcId: process.env.VPC_ID,
      }
    : { type: "default" as const };

// Create CDK app
const app = new App();

// Set context for feature flags (must be before creating stacks)
app.node.setContext("@aws-cdk/aws-iam:minimizePolicies", true);

// Define common props - include account/region for CDK context lookups
const commonProps = {
    configuration,
    description: `Serverless Launchpad ${environment} environment`,
    env: {
        account,
        region,
    },
};

// Create stacks in dependency order
const secretsStack = new SecretsStack(app, `slp-secrets-stack-${environment}`, {
    ...commonProps,
    description: `Secrets and configuration for Serverless Launchpad ${environment}`,
});

const cognitoStack = new CognitoStack(app, `slp-cognito-stack-${environment}`, {
    ...commonProps,
    description: `Cognito User Pool for Serverless Launchpad ${environment}`,
});

const dynamoDbStack = new DynamoDbStack(app, `slp-dynamodb-stack-${environment}`, {
    ...commonProps,
    description: `DynamoDB tables for Serverless Launchpad ${environment}`,
});

// Create network stack with shared VPC and target group
const networkStack = new NetworkStack(app, `slp-network-stack-${environment}`, {
    ...commonProps,
    description: `Network infrastructure for Serverless Launchpad ${environment}`,
    vpcConfig,
});

// Create Lambda stack with pre-created VPC (creates its own target group)
// Note: Lambda stack looks up the configuration secret by name to avoid cross-stack export dependencies
const apiLambdaStack = new ApiLambdaStack(app, `slp-lambda-stack-${environment}`, {
    ...commonProps,
    description: `API Lambda function for Serverless Launchpad ${environment}`,
    encryptionKey: secretsStack.encryptionKey,
    userPoolId: cognitoStack.userPool.userPoolId,
    userPoolClientId: cognitoStack.userPoolClient.userPoolClientId,
    vpc: networkStack.vpc,
});

// Create ALB stack with pre-created VPC, security group and Lambda's target group
const albStack = new AlbStack(app, `slp-alb-stack-${environment}`, {
    ...commonProps,
    description: `Application Load Balancer for Serverless Launchpad ${environment}`,
    vpc: networkStack.vpc,
    securityGroup: networkStack.albSecurityGroup,
    targetGroup: apiLambdaStack.targetGroup,
});

// Define stack dependencies - clean dependency chain
cognitoStack.addDependency(secretsStack);
dynamoDbStack.addDependency(secretsStack);
networkStack.addDependency(secretsStack);
apiLambdaStack.addDependency(secretsStack);
apiLambdaStack.addDependency(cognitoStack);
apiLambdaStack.addDependency(dynamoDbStack);
apiLambdaStack.addDependency(networkStack);
albStack.addDependency(networkStack);
albStack.addDependency(apiLambdaStack); // ALB needs Lambda's target group

// Create Web Static Hosting Stacks for each frontend
const webPackages: WebPackageName[] = ["mantine", "shadcn", "daisyui", "svelte"];

webPackages.forEach((pkg) => {
    const stack = new WebStaticHostingStack(app, `slp-web-${pkg}-stack-${environment}`, {
        ...commonProps,
        description: `Static web hosting for web.${pkg} - ${environment}`,
        webPackageName: pkg,
        webBaseUrl: configuration.web.baseUrl,
    });
    // Web stacks depend on secrets for potential future config needs
    stack.addDependency(secretsStack);
});

// Add tags to all stacks
const tags = configuration.tags;
Object.entries(tags).forEach(([key, value]) => {
    Tags.of(app).add(key, value);
});

export { app };
