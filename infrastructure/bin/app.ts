#!/usr/bin/env node
import "source-map-support/register";
import { App, Tags } from "aws-cdk-lib";
import { getConfiguration, Environment } from "../config/stack_configuration";
import { SecretsStack } from "../lib/secrets/secrets_stack";
import { AthenaStack } from "../lib/data/athena_stack";
import { AlbStack } from "../lib/alb/alb_stack";
import { ApiLambdaStack } from "../lib/lambda/api_lambda_stack";
import { CognitoStack } from "../lib/auth/cognito_stack";

// Get environment variables - use NODE_ENV as single source of truth
const environment = (process.env.NODE_ENV || "development") as Environment;

// AWS Profile is required - CDK will resolve account/region from profile
if (!process.env.AWS_PROFILE) {
  throw new Error("AWS_PROFILE environment variable is required. Set it to your AWS profile name.");
}

// Get configuration for environment
const configuration = getConfiguration(environment);

// Get VPC configuration from environment
const vpcConfig = process.env.VPC_CONFIG ? {
  type: process.env.VPC_CONFIG as 'default' | 'custom' | 'existing',
  vpcId: process.env.VPC_ID,
} : { type: 'custom' as const };

// Create CDK app
const app = new App();

// Define common props - CDK will resolve account/region from AWS_PROFILE
const commonProps = {
  configuration,
  description: `Serverless Launchpad ${environment} environment`,
};

// Create stacks
const secretsStack = new SecretsStack(app, `serverlesslaunchpad_secrets_stack_${environment}`, {
  ...commonProps,
  description: `Secrets and configuration for Serverless Launchpad ${environment}`,
});

const athenaStack = new AthenaStack(app, `serverlesslaunchpad_data_stack_${environment}`, {
  ...commonProps,
  description: `Data infrastructure for Serverless Launchpad ${environment}`,
});

const cognitoStack = new CognitoStack(app, `serverlesslaunchpad_cognito_stack_${environment}`, {
  ...commonProps,
  description: `Cognito User Pool for Serverless Launchpad ${environment}`,
});

const albStack = new AlbStack(app, `serverlesslaunchpad_alb_stack_${environment}`, {
  ...commonProps,
  description: `Application Load Balancer for Serverless Launchpad ${environment}`,
  vpcConfig,
});

const apiLambdaStack = new ApiLambdaStack(app, `serverlesslaunchpad_lambda_stack_${environment}`, {
  ...commonProps,
  description: `API Lambda function for Serverless Launchpad ${environment}`,
  targetGroup: albStack.targetGroup,
  configurationSecret: secretsStack.configurationSecret,
  queryResultsBucket: athenaStack.queryResultsBucket,
  userPoolId: cognitoStack.userPool.userPoolId,
  userPoolClientId: cognitoStack.userPoolClient.userPoolClientId,
  vpc: albStack.vpc,
  vpcConfig,
});

// Define stack dependencies
athenaStack.addDependency(secretsStack);
cognitoStack.addDependency(secretsStack);
albStack.addDependency(secretsStack);
apiLambdaStack.addDependency(secretsStack);
apiLambdaStack.addDependency(athenaStack);
apiLambdaStack.addDependency(albStack);
apiLambdaStack.addDependency(cognitoStack);

// Add tags to all stacks
const tags = configuration.tags;
Object.entries(tags).forEach(([key, value]) => {
  Tags.of(app).add(key, value);
});

// Set context for feature flags
app.node.setContext("@aws-cdk/aws-iam:minimizePolicies", true);

export { app };