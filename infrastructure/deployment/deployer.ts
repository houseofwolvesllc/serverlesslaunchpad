import { Environment } from "@houseofwolves/serverlesslaunchpad.core";
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

            let deployCommand;

            if (deployAll) {
                deployCommand = $`AWS_PROFILE=${awsProfile} npx cdk deploy --all --require-approval never --progress events`;
            } else if (withDependencies) {
                deployCommand = $`AWS_PROFILE=${awsProfile} npx cdk deploy --require-approval never --progress events ${stacks}`;
            } else {
                deployCommand = $`AWS_PROFILE=${awsProfile} npx cdk deploy --require-approval never --progress events --exclusively ${stacks}`;
            }

            // Set environment variables and verbose mode
            const previousVerbose = $.verbose;
            $.verbose = true;
            process.env.FORCE_COLOR = "true";

            await deployCommand;

            // Restore previous verbose setting
            $.verbose = previousVerbose;

            console.log(chalk.green.bold("\n✅ Deployment completed successfully!"));
        } catch (error) {
            console.error(chalk.red(`\n❌ Deployment failed: ${(error as Error).message}`));
            process.exit(1);
        }
    }
}
