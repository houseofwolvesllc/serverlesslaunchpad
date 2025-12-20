import { Environment } from "@houseofwolves/serverlesslaunchpad.core";
import { CloudFormationClient, DescribeStacksCommand, ListStacksCommand, Export } from "@aws-sdk/client-cloudformation";
import chalk from "chalk";
import { config } from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { $ } from "zx";
import { StackManager } from "./stack_manager";

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Handles deployment of CDK stacks with interactive prompts
 */
export class Deployer extends StackManager {
    constructor() {
        super();
    }

    async run(): Promise<void> {
        try {
            console.log(chalk.bold.blue("\n🚀 Serverless Launchpad Deployment Tool 🚀\n"));

            const awsProfile = await this.promptForAwsProfile();
            console.log(chalk.green(`\nUsing AWS profile: ${chalk.bold(awsProfile)}\n`));

            const environment = await this.promptForEnvironment();
            const selectedServices = await this.promptForServices("deploy");

            // Load environment configuration
            await this.loadEnvironmentConfig(environment);

            // Clear cdk.out before proceeding
            await this.clearCdkOut();

            // Configure VPC if needed
            await this.configureVpc(environment);

            // Generate config from deployed stacks if deploying Lambda
            if (selectedServices.includes('lambda') || selectedServices.length === this.getAvailableStacks().length) {
                await this.generateConfigFromStacks(environment, awsProfile);
            }

            if (!(await this.confirmDeployment(environment, selectedServices, awsProfile))) {
                console.log(chalk.yellow("\nDeployment cancelled."));
                process.exit(0);
            }

            await this.deploy(environment, selectedServices, awsProfile);
        } catch (error) {
            console.error(chalk.red(`\n❌ Error: ${(error as Error).message}`));
            process.exit(1);
        }
    }

    /**
     * Load environment-specific configuration
     */
    private async loadEnvironmentConfig(environment: Environment): Promise<void> {
        const envFile = path.join(__dirname, "..", "environments", `.env.${environment}`);
        console.log(chalk.blue(`Loading configuration from ${envFile}...`));

        if (fs.existsSync(envFile)) {
            config({ path: envFile });
            console.log(chalk.green("✅ Environment configuration loaded"));
        } else {
            console.log(chalk.yellow(`⚠️  No environment file found at ${envFile}`));
            console.log(chalk.yellow("   Using default configuration"));
        }

        // Set CDK environment - use NODE_ENV as single source of truth
        process.env.NODE_ENV = environment;
    }

    /**
     * Configure VPC settings
     */
    private async configureVpc(environment: Environment): Promise<void> {
        const vpcConfigFile = path.join(__dirname, "..", "environments", `.vpc.${environment}.json`);
        let vpcConfig: { type: string; vpcId?: string };

        if (fs.existsSync(vpcConfigFile)) {
            vpcConfig = JSON.parse(fs.readFileSync(vpcConfigFile, "utf-8"));
            console.log(chalk.blue(`Using saved VPC configuration: ${vpcConfig.type}`));
        } else {
            console.log(chalk.cyan("\nVPC Configuration:"));
            console.log(`  ${chalk.green("1")} Default VPC (Recommended - Free, simpler)`);
            console.log(`  ${chalk.green("2")} Custom VPC (Network isolation, ~$65/month NAT Gateway)`);
            console.log(`  ${chalk.green("3")} Existing VPC (Use pre-existing VPC)`);

            const vpcChoice = await this.question(chalk.yellow("\nEnter choice [1-3]: "));
            const vpcTypes = ["default", "custom", "existing"];
            const vpcType = vpcTypes[parseInt(vpcChoice, 10) - 1] || "default";

            vpcConfig = { type: vpcType };

            if (vpcType === "existing") {
                const vpcId = await this.question(chalk.yellow("Enter existing VPC ID: "));
                if (vpcId) {
                    vpcConfig.vpcId = vpcId;
                } else {
                    console.log(chalk.yellow("No VPC ID provided. Using default VPC."));
                    vpcConfig.type = "default";
                }
            }

            // Save configuration
            fs.writeFileSync(vpcConfigFile, JSON.stringify(vpcConfig, null, 2));
            console.log(chalk.green(`✅ VPC configuration saved to ${vpcConfigFile}`));
        }

        // Pass to CDK
        process.env.VPC_CONFIG = vpcConfig.type;
        if (vpcConfig.vpcId) {
            process.env.VPC_ID = vpcConfig.vpcId;
        }
    }

    /**
     * Clear CDK output directory
     */
    async clearCdkOut(): Promise<void> {
        try {
            console.log(chalk.blue("Clearing cdk.out directory..."));
            const cdkOutPath = path.resolve(__dirname, "..", "cdk.out");

            if (fs.existsSync(cdkOutPath)) {
                await $`rm -rf ${cdkOutPath}`;
                console.log(chalk.green("✅ cdk.out directory cleared"));
            }
        } catch (error) {
            console.error(chalk.yellow(`⚠️ Warning: Failed to clear cdk.out: ${(error as Error).message}`));
        }
    }

    /**
     * Confirm deployment with user
     */
    async confirmDeployment(environment: Environment, services: string[], awsProfile: string): Promise<boolean> {
        const stacks = await this.listStacks(environment, services, awsProfile);

        if (stacks.length === 0) {
            console.log(chalk.red("No matching stacks found for the specified criteria."));
            return false;
        }

        console.log(chalk.cyan(`\nThe following ${stacks.length} stacks will be deployed:`));
        stacks.forEach((stack) => console.log(`  - ${chalk.bold(stack)}`));

        if (environment === "production") {
            console.log(chalk.yellow("\n⚠️  WARNING: Deploying to PRODUCTION environment!"));
        }

        const confirm = await this.question(chalk.yellow("\nProceed with deployment? (yes/no): "));
        return confirm.toLowerCase() === "yes" || confirm.toLowerCase() === "y";
    }

    /**
     * Deploy the selected stacks
     */
    async deploy(environment: Environment, services: string[], awsProfile: string): Promise<void> {
        const stacks = await this.listStacks(environment, services, awsProfile);

        if (stacks.length === 0) {
            console.log(chalk.red("No matching stacks found. Deployment aborted."));
            return;
        }

        const deployAll = services.length === this.getAvailableStacks().length;

        try {
            console.log(chalk.blue("\nStarting deployment..."));

            // Deployment options
            console.log(chalk.cyan("Deployment Options:"));
            console.log(`  ${chalk.green("1")} Deploy selected stacks only`);
            console.log(`  ${chalk.green("2")} Deploy selected stacks with dependencies`);

            const deployOption = await this.question(chalk.yellow("\nEnter option [1-2]: "));
            const withDependencies = deployOption === "2";

            // Bootstrap if needed
            await this.bootstrapEnvironment(awsProfile);

            // Get account and region from environment (set by promptForAwsProfile)
            const awsAccountId = process.env.AWS_ACCOUNT_ID;
            const awsRegion = process.env.AWS_REGION;

            let deployCommand;

            if (deployAll) {
                deployCommand = $`AWS_PROFILE=${awsProfile} AWS_ACCOUNT_ID=${awsAccountId} AWS_REGION=${awsRegion} npx cdk deploy --all --require-approval never --progress events`;
            } else if (withDependencies) {
                deployCommand = $`AWS_PROFILE=${awsProfile} AWS_ACCOUNT_ID=${awsAccountId} AWS_REGION=${awsRegion} npx cdk deploy --require-approval never --progress events ${stacks}`;
            } else {
                deployCommand = $`AWS_PROFILE=${awsProfile} AWS_ACCOUNT_ID=${awsAccountId} AWS_REGION=${awsRegion} npx cdk deploy --require-approval never --progress events --exclusively ${stacks}`;
            }

            // Set environment variables and verbose mode
            const previousVerbose = $.verbose;
            $.verbose = true;
            process.env.FORCE_COLOR = "true";

            await deployCommand;

            // Restore previous verbose setting
            $.verbose = previousVerbose;

            console.log(chalk.green.bold("\n✅ Deployment completed successfully!"));
            
            // Always generate local.config.json after deployment
            await this.generateLocalConfig(environment);
        } catch (error) {
            console.error(chalk.red(`\n❌ Deployment failed: ${(error as Error).message}`));
            process.exit(1);
        }
    }

    /**
     * Generate configuration from deployed stack outputs
     */
    private async generateConfigFromStacks(environment: Environment, awsProfile: string): Promise<void> {
        console.log(chalk.blue("\n📝 Checking configuration..."));
        
        const configPath = path.join(__dirname, "../../api.hypermedia/config");
        const configFile = path.join(configPath, `${environment}.config.json`);
        
        // Check if config already exists
        if (fs.existsSync(configFile)) {
            console.log(chalk.gray("Configuration file already exists, will be updated during deployment"));
            return;
        }
        
        // Get Lambda stack dependencies from stack configuration
        const allStacks = this.getAvailableStacks();
        const lambdaStack = allStacks.find(s => s.name === 'lambda');
        const requiredStackNames = lambdaStack?.dependencies || ['cognito', 'data', 'alb'];
        
        // Map to actual stack names
        const requiredStacks = requiredStackNames.map((name: string) => ({
            name,
            stackName: `serverlesslaunchpad-${name}-stack-${environment}`
        }));
        
        const missingStacks: string[] = [];
        
        for (const stack of requiredStacks) {
            try {
                await $`AWS_PROFILE=${awsProfile} aws cloudformation describe-stacks --stack-name ${stack.stackName} 2>/dev/null`;
            } catch {
                missingStacks.push(stack.name);
            }
        }
        
        if (missingStacks.length > 0) {
            console.log(chalk.yellow(`⚠️  Cannot generate config: required stacks not deployed (${missingStacks.join(', ')})`));
            console.log(chalk.yellow("Config will be generated after these stacks are deployed."));
            return;
        }
        
        // Fetch outputs from stacks
        console.log(chalk.blue("Generating configuration from deployed stacks..."));
        
        try {
            // Get stack outputs for all required stacks
            const stackOutputs: Record<string, any> = {};
            
            for (const stack of requiredStacks) {
                const { stdout } = await $`AWS_PROFILE=${awsProfile} aws cloudformation describe-stacks --stack-name ${stack.stackName} --query "Stacks[0].Outputs" --output json`;
                stackOutputs[stack.name] = JSON.parse(stdout);
            }
            
            // Helper to extract output value
            const getOutputValue = (stackName: string, key: string): string | undefined => {
                const outputs = stackOutputs[stackName] || [];
                const output = outputs.find((o: any) => o.OutputKey === key || o.ExportName?.includes(key));
                return output?.OutputValue;
            };
            
            // Build config object matching the structure in api_lambda_stack.ts
            const userPoolId = getOutputValue('cognito', 'UserPoolId');
            const config = {
                cognito: stackOutputs['cognito'] ? {
                    user_pool_id: userPoolId,
                    user_pool_client_id: getOutputValue('cognito', 'UserPoolClientId'),
                    user_pool_provider_url: `https://cognito-idp.${process.env.AWS_REGION}.amazonaws.com/${userPoolId}`,
                } : {},
                athena: stackOutputs['data'] ? {
                    workgroup: getOutputValue('data', 'WorkGroupName'),
                    results_bucket: getOutputValue('data', 'QueryResultsBucketName'),
                } : {},
                alb: stackOutputs['alb'] ? {
                    target_group_arn: getOutputValue('alb', 'TargetGroupArn'),
                } : {},
                features: {
                    enable_analytics: environment === Environment.Production,
                    enable_rate_limiting: environment !== Environment.Development,
                    enable_advanced_security: environment === Environment.Production,
                },
                limits: {
                    max_api_keys_per_user: environment === Environment.Production ? 3 : 10,
                    session_timeout_hours: environment === Environment.Production ? 8 : 24,
                    max_query_timeout_seconds: environment === Environment.Production ? 120 : 300,
                },
            };
            
            // Create config directory if it doesn't exist
            if (!fs.existsSync(configPath)) {
                fs.mkdirSync(configPath, { recursive: true });
            }
            
            // Write config file
            fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
            console.log(chalk.green(`✅ Generated configuration: ${configFile}`));
            
        } catch (error) {
            console.error(chalk.yellow(`⚠️  Could not generate config: ${(error as Error).message}`));
            console.log(chalk.yellow("Config will be generated during Lambda stack deployment."));
        }
    }
    
    /**
     * Generate configurations from deployed CloudFormation stacks
     */
    private async generateLocalConfig(environment: Environment): Promise<void> {
        try {
            console.log(chalk.blue("\n📄 Generating configuration files from deployed stacks..."));
            
            const awsRegion = process.env.AWS_REGION || process.env.CDK_DEFAULT_REGION || 'us-west-2';
            const awsProfile = process.env.AWS_PROFILE;
            
            console.log(chalk.gray(`   AWS Region: ${awsRegion}`));
            console.log(chalk.gray(`   AWS Profile: ${awsProfile || 'default'}`));
            
            // Initialize CloudFormation client - don't manually set credentials when using profile
            const cfnClient = new CloudFormationClient({ 
                region: awsRegion
                // AWS SDK will automatically use the profile from AWS_PROFILE env var
            });
            
            // List existing stacks for debugging
            await this.listExistingStacks(cfnClient, environment);
            
            // Generate config from stack outputs
            await this.generateConfigFromStackOutputs(cfnClient, environment);
            
            console.log(chalk.gray(`   You can now run: cd ../api.hypermedia && npm run dev`));
        } catch (error) {
            console.error(chalk.yellow(`⚠️  Could not generate config: ${(error as Error).message}`));
        }
    }
    
    /**
     * List existing stacks for debugging
     */
    private async listExistingStacks(cfnClient: CloudFormationClient, environment: Environment): Promise<void> {
        try {
            const command = new ListStacksCommand({
                StackStatusFilter: ['CREATE_COMPLETE', 'UPDATE_COMPLETE']
            });
            const response = await cfnClient.send(command);
            
            const relevantStacks = response.StackSummaries?.filter(stack => 
                stack.StackName?.includes(`-${environment}`)
            ) || [];
            
            console.log(chalk.gray(`   Found ${relevantStacks.length} deployed stacks for ${environment}:`));
            relevantStacks.forEach(stack => {
                console.log(chalk.gray(`     - ${stack.StackName}`));
            });
            
        } catch (error: any) {
            console.log(chalk.yellow(`⚠️  Could not list stacks: ${error.message}`));
        }
    }
    
    /**
     * Generate configuration from actual deployed CloudFormation outputs
     */
    private async generateConfigFromStackOutputs(cfnClient: CloudFormationClient, environment: Environment): Promise<void> {
        const config: any = {
            environment: environment,
            _generated: new Date().toISOString(),
        };
        
        // Fetch outputs from each stack
        const stackConfigs = [
            { name: `slp-cognito-stack-${environment}`, key: 'cognito' },
            { name: `slp-data-stack-${environment}`, key: 'athena' },  // Fixed: was slp-athena-stack
            { name: `slp-secrets-stack-${environment}`, key: 'secrets' },
            { name: `slp-lambda-stack-${environment}`, key: 'lambda' },
            { name: `slp-alb-stack-${environment}`, key: 'alb' },
        ];
        
        for (const { name, key } of stackConfigs) {
            try {
                const outputs = await this.getStackOutputs(cfnClient, name);
                if (outputs.length > 0) {
                    config[key] = this.transformOutputs(outputs, key);
                    console.log(chalk.gray(`   ✓ Found ${outputs.length} outputs from ${name}`));
                }
            } catch (error: any) {
                console.log(chalk.yellow(`⚠️  Stack ${name}: ${error.message}`));
                // More detailed error for debugging
                if (error.name === 'ValidationException' && error.message.includes('does not exist')) {
                    console.log(chalk.gray(`     (Stack not deployed yet)`));
                }
            }
        }
        
        // Add feature flags and limits based on environment
        config.features = {
            enable_analytics: environment === Environment.Production,
            enable_rate_limiting: environment !== Environment.Development,
            enable_advanced_security: environment === Environment.Production,
        };
        
        config.limits = {
            max_api_keys_per_user: environment === Environment.Production ? 3 : 10,
            session_timeout_hours: environment === Environment.Production ? 8 : 24,
            max_query_timeout_seconds: environment === Environment.Production ? 120 : 300,
        };
        
        // Write environment-specific config
        this.writeConfig(config, `${environment}.config.json`);
        
        // Always write local.config.json
        this.writeConfig({
            ...config,
            _source: `Generated from ${environment} environment`
        }, 'local.config.json');
    }
    
    /**
     * Get CloudFormation stack outputs
     */
    private async getStackOutputs(cfnClient: CloudFormationClient, stackName: string): Promise<Export[]> {
        const command = new DescribeStacksCommand({ StackName: stackName });
        const response = await cfnClient.send(command);
        
        if (!response.Stacks || response.Stacks.length === 0) {
            throw new Error(`Stack ${stackName} not found`);
        }
        
        return response.Stacks[0].Outputs || [];
    }
    
    /**
     * Transform CloudFormation outputs to config structure
     */
    private transformOutputs(outputs: Export[], stackKey: string): any {
        const result: any = {};
        
        for (const output of outputs) {
            if (!output.OutputKey || !output.OutputValue) continue;
            
            // Map specific outputs based on stack type
            switch (stackKey) {
                case 'cognito':
                    if (output.OutputKey.includes('UserPoolId')) {
                        result.user_pool_id = output.OutputValue;
                    } else if (output.OutputKey.includes('UserPoolClientId')) {
                        result.user_pool_client_id = output.OutputValue;
                    } else if (output.OutputKey.includes('UserPoolProviderUrl')) {
                        result.user_pool_provider_url = output.OutputValue;
                    }
                    break;
                
                case 'athena':
                    if (output.OutputKey.includes('WorkGroupName')) {
                        result.workgroup = output.OutputValue;
                    } else if (output.OutputKey.includes('QueryResultsBucketName')) {
                        result.results_bucket = output.OutputValue;
                    } else if (output.OutputKey.includes('DataBucketName')) {
                        result.data_bucket = output.OutputValue;
                    }
                    break;
                
                case 'secrets':
                    if (output.OutputKey.includes('SecretArn')) {
                        result.configuration_secret_arn = output.OutputValue;
                    } else if (output.OutputKey.includes('EncryptionKeyArn')) {
                        result.encryption_key_arn = output.OutputValue;
                    }
                    break;
                
                case 'lambda':
                    if (output.OutputKey.includes('FunctionArn')) {
                        result.function_arn = output.OutputValue;
                    } else if (output.OutputKey.includes('FunctionName')) {
                        result.function_name = output.OutputValue;
                    }
                    break;
                
                case 'alb':
                    if (output.OutputKey.includes('LoadBalancerDnsName')) {
                        result.dns_name = output.OutputValue;
                    } else if (output.OutputKey.includes('TargetGroupArn')) {
                        result.target_group_arn = output.OutputValue;
                    }
                    break;
            }
        }
        
        return result;
    }
    
    /**
     * Write configuration file
     */
    private writeConfig(config: any, filename: string): void {
        const configDir = path.join(__dirname, '../../api.hypermedia/config');
        const configPath = path.join(configDir, filename);
        
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
        
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        console.log(chalk.green(`✅ Generated ${filename}`));
    }
}
