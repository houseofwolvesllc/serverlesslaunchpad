import { Duration, RemovalPolicy } from "aws-cdk-lib";
import { IVpc } from "aws-cdk-lib/aws-ec2";
import { ApplicationTargetGroup, TargetType } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { LambdaTarget } from "aws-cdk-lib/aws-elasticloadbalancingv2-targets";
import { Effect, PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Key } from "aws-cdk-lib/aws-kms";
import { Architecture, Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction, OutputFormat } from "aws-cdk-lib/aws-lambda-nodejs";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { ISecret, Secret } from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";
import { BaseStack, BaseStackProps } from "../base/base_stack";

export interface ApiLambdaStackProps extends BaseStackProps {
    encryptionKey?: Key;
    userPoolId: string;
    userPoolClientId: string;
    vpc: IVpc;
    description?: string;
}

/**
 * Stack for the API Lambda function
 */
export class ApiLambdaStack extends BaseStack {
    public readonly apiFunction: NodejsFunction;
    public readonly targetGroup: ApplicationTargetGroup;
    public readonly executionRole: Role;
    private readonly logGroup: LogGroup;
    private readonly configurationSecret: ISecret;

    constructor(scope: Construct, id: string, props: ApiLambdaStackProps) {
        super(scope, id, props);

        // Look up secret by name to avoid cross-stack export dependencies
        // This allows secret name changes without CloudFormation blocking due to exports in use
        this.configurationSecret = Secret.fromSecretNameV2(
            this,
            this.constructId("config-secret-lookup"),
            this.configuration.secrets.secretName
        );

        this.logGroup = this.createLogGroup();
        this.executionRole = this.createExecutionRole();
        this.addExecutionRolePolicies(props);
        this.targetGroup = this.createTargetGroup(props);
        this.apiFunction = this.createLambdaFunction(props);
        this.configureLambdaIntegration();
        this.createOutputs();
    }


    /**
     * Create CloudWatch log group for Lambda logs
     */
    private createLogGroup(): LogGroup {
        return new LogGroup(this, this.constructId("api-lambda-log-group"), {
            logGroupName: `/aws/lambda/${this.resourceName("api")}`,
            retention: this.getLogRetention(),
            removalPolicy: this.getRemovalPolicy(),
        });
    }

    /**
     * Create ALB target group for Lambda
     */
    private createTargetGroup(props: ApiLambdaStackProps): ApplicationTargetGroup {
        const { vpc } = props;

        return new ApplicationTargetGroup(this, this.constructId("lambda-target-group"), {
            targetGroupName: this.resourceName("lambda-tg"),
            targetType: TargetType.LAMBDA,
            vpc: vpc, // VPC is required for target groups
            // Lambda target groups don't support custom health check configuration
            // AWS automatically handles health checks for Lambda targets
        });
    }

    /**
     * Create IAM execution role for Lambda function
     */
    private createExecutionRole(): Role {
        return new Role(this, this.constructId("api-lambda-execution-role"), {
            roleName: this.resourceName("api-lambda-role"),
            assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
            description: `Execution role for Serverless Launchpad API Lambda (${this.appEnvironment})`,
        });
    }

    /**
     * Add necessary IAM policies to the execution role
     */
    private addExecutionRolePolicies(props: ApiLambdaStackProps): void {
        const { encryptionKey, userPoolId } = props;

        this.addBasicLambdaPolicy();
        this.addSecretsManagerPolicy();
        this.addKmsPolicy(encryptionKey);
        this.addCognitoPolicy(userPoolId);
        this.addDynamoDbPolicy();
    }

    /**
     * Add basic Lambda execution policy
     */
    private addBasicLambdaPolicy(): void {
        this.executionRole.addToPolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
                resources: [`arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/*`],
            })
        );
    }

    /**
     * Add Secrets Manager policy for configuration access
     */
    private addSecretsManagerPolicy(): void {
        this.executionRole.addToPolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"],
                resources: [this.configurationSecret.secretArn],
            })
        );
    }

    /**
     * Add KMS policy for decrypting secrets (production only)
     */
    private addKmsPolicy(encryptionKey?: Key): void {
        if (!encryptionKey) {
            return; // No KMS key in non-production environments
        }

        this.executionRole.addToPolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ["kms:Decrypt", "kms:GenerateDataKey"],
                resources: [encryptionKey.keyArn],
            })
        );
    }

    /**
     * Add Cognito policy for user management operations
     */
    private addCognitoPolicy(userPoolId: string): void {
        this.executionRole.addToPolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                    "cognito-idp:AdminGetUser",
                    "cognito-idp:AdminCreateUser",
                    "cognito-idp:AdminDeleteUser",
                    "cognito-idp:AdminUpdateUserAttributes",
                    "cognito-idp:AdminSetUserPassword",
                    "cognito-idp:AdminConfirmSignUp",
                    "cognito-idp:AdminAddUserToGroup",
                    "cognito-idp:AdminRemoveUserFromGroup",
                    "cognito-idp:ListUsers",
                    "cognito-idp:ListUsersInGroup",
                ],
                resources: [`arn:aws:cognito-idp:${this.region}:${this.account}:userpool/${userPoolId}`],
            })
        );
    }

    /**
     * Add DynamoDB policy for data access
     * Grants access to all tables with prefix slp_{environment}_*
     */
    private addDynamoDbPolicy(): void {
        const tablePattern = `arn:aws:dynamodb:${this.region}:${this.account}:table/slp_${this.appEnvironment}_*`;

        this.executionRole.addToPolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                    "dynamodb:GetItem",
                    "dynamodb:PutItem",
                    "dynamodb:UpdateItem",
                    "dynamodb:DeleteItem",
                    "dynamodb:Query",
                    "dynamodb:Scan",
                    "dynamodb:BatchWriteItem",
                    "dynamodb:BatchGetItem",
                ],
                resources: [tablePattern],
            })
        );
    }

    /**
     * Create the Lambda function
     */
    private createLambdaFunction(props: ApiLambdaStackProps): NodejsFunction {
        const { api } = this.configuration;

        const functionProps = {
            functionName: this.resourceName(`api-hypermedia`),
            runtime: Runtime.NODEJS_20_X,
            architecture: Architecture.ARM_64,
            entry: "../api.hypermedia/dist/index.js",
            handler: "handler",

            // Bundling configuration
            bundling: {
                minify: this.isProduction(),
                sourceMap: true,
                target: "node20",
                format: OutputFormat.ESM,
                mainFields: ["main", "module"],
                externalModules: ["@aws-sdk/*"],
                define: {
                    "process.env.NODE_ENV": JSON.stringify(this.appEnvironment),
                },
                // Banner to support dynamic require() in ESM context
                banner: `import { createRequire } from 'module'; const require = createRequire(import.meta.url);`,
                forceDockerBundling: true,
                // Run tsc before esbuild to emit decorator metadata for DI
                commandHooks: {
                    beforeBundling(inputDir: string): string[] {
                        const apiDir = `${inputDir}/api.hypermedia`;
                        return [
                            // Build with tsconfig.build.json (has types:["node"] instead of vitest)
                            `cd ${apiDir} && npx tsc -p tsconfig.build.json && npx tsc-alias -p tsconfig.build.json && cp -r config dist/`,
                        ];
                    },
                    afterBundling(inputDir: string, outputDir: string): string[] {
                        // Copy config files to Lambda package (esbuild only bundles JS)
                        const apiDir = `${inputDir}/api.hypermedia`;
                        return [
                            `cp -r ${apiDir}/config ${outputDir}/`,
                        ];
                    },
                    beforeInstall(): string[] {
                        return [];
                    },
                },
                loader: {
                    ".html": "text",
                    ".css": "text",
                },
            },

            // Configuration
            memorySize: api.memory,
            timeout: Duration.seconds(api.timeout),
            reservedConcurrentExecutions: api.reservedConcurrentExecutions,

            // Environment variables
            environment: {
                NODE_ENV: this.appEnvironment,
                AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1", // AWS SDK optimization
                // Pass all configuration as environment variables
                // The Lambda code can read these and build its config object
                COGNITO_USER_POOL_ID: props.userPoolId,
                COGNITO_USER_POOL_CLIENT_ID: props.userPoolClientId,
                CONFIGURATION_SECRET_ARN: this.configurationSecret.secretArn,
                // Feature flags
                ENABLE_ANALYTICS: String(this.appEnvironment === "production"),
                ENABLE_RATE_LIMITING: String(this.appEnvironment !== "development"),
                ENABLE_ADVANCED_SECURITY: String(this.appEnvironment === "production"),
                // Limits
                MAX_API_KEYS_PER_USER: String(this.appEnvironment === "production" ? 3 : 10),
                SESSION_TIMEOUT_HOURS: String(this.appEnvironment === "production" ? 8 : 24),
                MAX_QUERY_TIMEOUT_SECONDS: String(this.appEnvironment === "production" ? 120 : 300),
            },

            // Security and monitoring
            role: this.executionRole,
            logGroup: this.logGroup,

            // Performance optimizations
            deadLetterQueueEnabled: false,
            retryAttempts: 0,
            currentVersionOptions: {
                removalPolicy: this.appEnvironment === "production" ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
            },
        };

        // Configure VPC if needed
        this.configureVpc(functionProps, props);

        return new NodejsFunction(this, this.constructId("api-function"), functionProps);
    }

    /**
     * Configure VPC settings if using custom VPC
     */
    private configureVpc(_functionProps: Record<string, any>, _props: ApiLambdaStackProps): void {
        // Lambda runs OUTSIDE VPC by default for:
        // - Full internet access (ChatGPT API, webhooks, etc.)
        // - Simpler architecture and lower costs (no NAT Gateway needed)
        // - AWS service access via IAM (not network-based)
        
        // To run Lambda INSIDE VPC (for RDS, ElastiCache, etc.), uncomment below:
        /*
        console.log("🔒 Configuring Lambda to run inside VPC...");
        functionProps.vpc = props.vpc;
        
        // For default VPC (public subnets only):
        functionProps.vpcSubnets = {
            subnetType: SubnetType.PUBLIC,
        };
        functionProps.allowPublicSubnet = true;
        
        // For custom VPC with private subnets + NAT Gateway:
        // functionProps.vpcSubnets = {
        //     subnetType: SubnetType.PRIVATE_WITH_EGRESS,
        // };
        */
    }

    /**
     * Configure Lambda integration with ALB target group
     */
    private configureLambdaIntegration(): void {
        // Register Lambda with target group
        this.targetGroup.addTarget(new LambdaTarget(this.apiFunction));

        // Grant ALB permission to invoke Lambda
        this.apiFunction.addPermission("AlbInvokePermission", {
            principal: new ServicePrincipal("elasticloadbalancing.amazonaws.com"),
            action: "lambda:InvokeFunction",
            sourceArn: this.targetGroup.targetGroupArn,
        });
    }

    /**
     * Create stack outputs
     */
    private createOutputs(): void {
        this.exportValue(this.apiFunction.functionArn, {
            name: `${this.stackName}-FunctionArn`,
        });

        this.exportValue(this.apiFunction.functionName, {
            name: `${this.stackName}-FunctionName`,
        });
    }

    /**
     * Get log retention based on environment
     */
    private getLogRetention(): RetentionDays {
        const days = this.configuration.api.logRetention;

        // Map days to RetentionDays enum
        const retentionMap: Record<number, RetentionDays> = {
            1: RetentionDays.ONE_DAY,
            3: RetentionDays.THREE_DAYS,
            5: RetentionDays.FIVE_DAYS,
            7: RetentionDays.ONE_WEEK,
            14: RetentionDays.TWO_WEEKS,
            30: RetentionDays.ONE_MONTH,
            60: RetentionDays.TWO_MONTHS,
            90: RetentionDays.THREE_MONTHS,
            120: RetentionDays.FOUR_MONTHS,
            150: RetentionDays.FIVE_MONTHS,
            180: RetentionDays.SIX_MONTHS,
            365: RetentionDays.ONE_YEAR,
            400: RetentionDays.THIRTEEN_MONTHS,
            545: RetentionDays.EIGHTEEN_MONTHS,
            731: RetentionDays.TWO_YEARS,
            1827: RetentionDays.FIVE_YEARS,
            3653: RetentionDays.TEN_YEARS,
        };

        // Find closest match
        const availableDays = Object.keys(retentionMap)
            .map(Number)
            .sort((a, b) => a - b);
        const closestDays = availableDays.find((d) => d >= days) || availableDays[availableDays.length - 1];

        return retentionMap[closestDays];
    }
}
