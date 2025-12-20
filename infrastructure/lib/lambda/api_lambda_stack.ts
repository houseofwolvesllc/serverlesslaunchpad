import { Duration, RemovalPolicy } from "aws-cdk-lib";
import { IVpc, SubnetType } from "aws-cdk-lib/aws-ec2";
import { ApplicationTargetGroup, TargetType } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { LambdaTarget } from "aws-cdk-lib/aws-elasticloadbalancingv2-targets";
import { Effect, PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Architecture, Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction, OutputFormat } from "aws-cdk-lib/aws-lambda-nodejs";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { BaseStack, BaseStackProps } from "../base/base_stack";

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface ApiLambdaStackProps extends BaseStackProps {
    configurationSecret: Secret;
    queryResultsBucket: Bucket;
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

    constructor(scope: Construct, id: string, props: ApiLambdaStackProps) {
        super(scope, id, props);

        this.logGroup = this.createLogGroup();
        this.executionRole = this.createExecutionRole();
        this.addExecutionRolePolicies(props);
        this.targetGroup = this.createTargetGroup(props);
        this.apiFunction = this.createLambdaFunction(props);
        this.configureLambdaIntegration();

        // Generate configuration file after creating resources
        this.generateConfigurationFile(props);
        this.createOutputs();
    }

    /**
     * Generate configuration file and copy it to api.hypermedia project
     */
    private generateConfigurationFile(props: ApiLambdaStackProps): void {
        const { userPoolId, userPoolClientId, queryResultsBucket } = props;

        // Build configuration from dependency stack outputs
        const config = {
            environment: this.appEnvironment,
            cognito: {
                user_pool_id: userPoolId,
                user_pool_client_id: userPoolClientId,
                user_pool_provider_url: `https://cognito-idp.${this.region}.amazonaws.com/${userPoolId}`,
            },
            athena: {
                workgroup: this.configuration.athena.workGroupName,
                results_bucket: queryResultsBucket.bucketName,
            },
            alb: {
                target_group_arn: this.targetGroup.targetGroupArn,
            },
            features: {
                enable_analytics: this.appEnvironment === "production",
                enable_rate_limiting: this.appEnvironment !== "development",
                enable_advanced_security: this.appEnvironment === "production",
            },
            limits: {
                max_api_keys_per_user: this.appEnvironment === "production" ? 3 : 10,
                session_timeout_hours: this.appEnvironment === "production" ? 8 : 24,
                max_query_timeout_seconds: this.appEnvironment === "production" ? 120 : 300,
            },
        };

        // Write config to api.hypermedia project
        const apiProjectPath = join(__dirname, "../../../api.hypermedia");
        const configDir = join(apiProjectPath, "config");
        const configFile = join(configDir, `${this.appEnvironment}.config.json`);

        try {
            // Create config directory if it doesn't exist
            if (!existsSync(configDir)) {
                mkdirSync(configDir, { recursive: true });
            }

            // Write configuration file
            writeFileSync(configFile, JSON.stringify(config, null, 2));
            console.log(`✅ Generated configuration file: ${configFile}`);
        } catch (error) {
            console.error(`❌ Failed to generate config file: ${error}`);
            throw error;
        }
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
        const { configurationSecret, queryResultsBucket, userPoolId } = props;

        this.addBasicLambdaPolicy();
        this.addSecretsManagerPolicy(configurationSecret);
        this.addCognitoPolicy(userPoolId);
        this.addAthenaPolicy();
        this.addS3Policy(queryResultsBucket);
        this.addGluePolicy();
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
    private addSecretsManagerPolicy(configurationSecret: Secret): void {
        this.executionRole.addToPolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"],
                resources: [configurationSecret.secretArn],
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
     * Add Athena policy for query execution
     */
    private addAthenaPolicy(): void {
        this.executionRole.addToPolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                    "athena:StartQueryExecution",
                    "athena:GetQueryExecution",
                    "athena:GetQueryResults",
                    "athena:StopQueryExecution",
                    "athena:GetWorkGroup",
                ],
                resources: [
                    `arn:aws:athena:${this.region}:${this.account}:workgroup/${this.configuration.athena.workGroupName}`,
                ],
            })
        );
    }

    /**
     * Add S3 policy for Athena query results
     */
    private addS3Policy(queryResultsBucket: Bucket): void {
        this.executionRole.addToPolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket"],
                resources: [queryResultsBucket.bucketArn, `${queryResultsBucket.bucketArn}/*`],
            })
        );
    }

    /**
     * Add Glue Data Catalog policy for Athena
     */
    private addGluePolicy(): void {
        this.executionRole.addToPolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                    "glue:GetDatabase",
                    "glue:GetTable",
                    "glue:GetPartition",
                    "glue:GetPartitions",
                    "glue:BatchCreatePartition",
                    "glue:BatchDeletePartition",
                    "glue:BatchUpdatePartition",
                ],
                resources: [
                    `arn:aws:glue:${this.region}:${this.account}:catalog`,
                    `arn:aws:glue:${this.region}:${this.account}:database/default`,
                    `arn:aws:glue:${this.region}:${this.account}:table/default/*`,
                ],
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
            entry: "../api.hypermedia/src/index.ts",
            handler: "handler",

            // Bundling configuration
            bundling: {
                minify: this.isProduction(), // Only minify in production
                sourceMap: true, // Always include source maps for debugging
                target: "node20",
                format: OutputFormat.ESM, // ESM format for modern Node.js
                mainFields: ["main", "module"],
                externalModules: [
                    // AWS SDK v3 is available in Lambda runtime
                    "@aws-sdk/*",
                ],
                // Define environment variables at build time
                define: {
                    "process.env.NODE_ENV": JSON.stringify(this.appEnvironment),
                },
                // Use Docker for consistent builds
                forceDockerBundling: true, // Set to true if you need consistent builds across platforms
                // Additional esbuild options
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
    private configureVpc(functionProps: Record<string, any>, props: ApiLambdaStackProps): void {
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
