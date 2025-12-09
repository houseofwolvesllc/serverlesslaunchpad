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
 * Handles destruction of CDK stacks with interactive prompts
 */
export class Destroyer extends StackManager {
    constructor() {
        super();
    }

    async run(): Promise<void> {
        try {
            console.log(chalk.bold.red("\n💥 Serverless Launchpad Destruction Tool 💥\n"));
            console.log(chalk.yellow("⚠️  WARNING: This will permanently delete AWS resources!"));
            console.log(chalk.yellow("   Make sure you have backed up any important data.\n"));

            const awsProfile = await this.promptForAwsProfile();
            console.log(chalk.green(`\nUsing AWS profile: ${chalk.bold(awsProfile)}\n`));

            const environment = await this.promptForEnvironment();

            // Extra confirmation for production
            if (environment === "production") {
                console.log(chalk.red.bold("\n🚨 PRODUCTION ENVIRONMENT SELECTED! 🚨"));
                console.log(chalk.red("This will destroy PRODUCTION resources!"));

                const prodConfirm = await this.question(chalk.red('Type "DESTROY PRODUCTION" to confirm: '));

                if (prodConfirm !== "DESTROY PRODUCTION") {
                    console.log(chalk.yellow("\nDestruction cancelled."));
                    process.exit(0);
                }
            }

            const selectedServices = await this.promptForServices("destroy");

            // Load environment configuration
            await this.loadEnvironmentConfig(environment);

            if (!(await this.confirmDestruction(environment, selectedServices, awsProfile))) {
                console.log(chalk.yellow("\nDestruction cancelled."));
                process.exit(0);
            }

            await this.destroy(environment, selectedServices, awsProfile);
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

        if (fs.existsSync(envFile)) {
            config({ path: envFile });
            console.log(chalk.green("✅ Environment configuration loaded"));
        }

        // Set CDK environment - use NODE_ENV as single source of truth
        process.env.NODE_ENV = environment;
    }

    /**
     * Confirm destruction with user
     */
    async confirmDestruction(environment: Environment, services: string[], awsProfile: string): Promise<boolean> {
        const stacks = await this.listStacks(environment, services, awsProfile);

        if (stacks.length === 0) {
            console.log(chalk.red("No matching stacks found for the specified criteria."));
            return false;
        }

        console.log(chalk.red(`\nThe following ${stacks.length} stacks will be DESTROYED:`));
        stacks.forEach((stack) => console.log(`  - ${chalk.bold(stack)}`));

        console.log(chalk.yellow("\n⚠️  This action cannot be undone!"));

        const confirm = await this.question(
            chalk.red("Are you absolutely sure you want to destroy these resources? (yes/no): ")
        );

        if (confirm.toLowerCase() !== "yes") {
            return false;
        }

        // Double confirmation
        const doubleConfirm = await this.question(chalk.red("Type the environment name to confirm destruction: "));

        return doubleConfirm.toLowerCase() === environment.toLowerCase();
    }

    /**
     * Destroy the selected stacks
     */
    async destroy(environment: Environment, services: string[], awsProfile: string): Promise<void> {
        const stacks = await this.listStacks(environment, services, awsProfile);

        if (stacks.length === 0) {
            console.log(chalk.red("No matching stacks found. Destruction aborted."));
            return;
        }

        const destroyAll = services.length === this.getAvailableStacks().length;

        try {
            console.log(chalk.red("\nStarting destruction..."));

            // Destroy in reverse order to handle dependencies
            const reversedStacks = [...stacks].reverse();

            let destroyCommand;

            if (destroyAll) {
                // When destroying all, CDK handles the order
                destroyCommand = $`AWS_PROFILE=${awsProfile} npx cdk destroy --all --force`;
            } else {
                // Destroy stacks one by one in reverse order
                for (const stack of reversedStacks) {
                    console.log(chalk.yellow(`\nDestroying ${stack}...`));

                    // Set environment variables and verbose mode for this command
                    const previousVerbose = $.verbose;
                    $.verbose = true;

                    process.env.FORCE_COLOR = "true";

                    await $`AWS_PROFILE=${awsProfile} npx cdk destroy ${stack} --force`;

                    // Restore previous verbose setting
                    $.verbose = previousVerbose;
                }

                console.log(chalk.green.bold("\n✅ All selected stacks destroyed successfully!"));
                await this.cleanupLocalFiles(environment);
                return;
            }

            // Set environment variables and verbose mode
            const previousVerbose = $.verbose;
            $.verbose = true;
            process.env.FORCE_COLOR = "true";

            await destroyCommand;

            // Restore previous verbose setting
            $.verbose = previousVerbose;

            console.log(chalk.green.bold("\n✅ Destruction completed successfully!"));

            // Clean up local files
            await this.cleanupLocalFiles(environment);
        } catch (error) {
            console.error(chalk.red(`\n❌ Destruction failed: ${(error as Error).message}`));
            console.error(chalk.yellow("Some resources may have been partially destroyed."));
            console.error(chalk.yellow("Check the AWS Console to verify resource status."));
            process.exit(1);
        }
    }

    /**
     * Clean up local configuration files
     */
    private async cleanupLocalFiles(environment: Environment): Promise<void> {
        console.log(chalk.blue("\n🧹 Cleaning up local files..."));

        const filesToClean = [
            // Infrastructure files
            path.join(__dirname, "..", "environments", `.vpc.${environment}.json`),
            path.join(__dirname, "..", "config", `${environment}.config.json`),
            // API config
            path.join(__dirname, "../../api.hypermedia/config", `${environment}.infrastructure.json`),
            // Web configs
            path.join(__dirname, "../../web.mantine/config", `${environment}.infrastructure.json`),
            path.join(__dirname, "../../web.shadcn/config", `${environment}.infrastructure.json`),
            path.join(__dirname, "../../web.daisyui/config", `${environment}.infrastructure.json`),
            path.join(__dirname, "../../web.svelte/config", `${environment}.infrastructure.json`),
        ];

        for (const file of filesToClean) {
            if (fs.existsSync(file)) {
                try {
                    fs.unlinkSync(file);
                    console.log(chalk.green(`✅ Removed ${path.basename(file)}`));
                } catch (error) {
                    console.warn(
                        chalk.yellow(`⚠️  Failed to remove ${path.basename(file)}: ${(error as Error).message}`)
                    );
                }
            }
        }

        // Clean CDK context if destroying all environments
        const allEnvironments: Environment[] = [Environment.Development, Environment.Staging, Environment.Production];
        const remainingEnvFiles = allEnvironments.some((env) =>
            fs.existsSync(path.join(__dirname, "..", "environments", `.vpc.${env}.json`))
        );

        if (!remainingEnvFiles) {
            const cdkContextFile = path.join(__dirname, "..", "cdk.context.json");
            if (fs.existsSync(cdkContextFile)) {
                try {
                    fs.unlinkSync(cdkContextFile);
                    console.log(chalk.green("✅ Removed cdk.context.json"));
                } catch (error) {
                    console.warn(chalk.yellow(`⚠️  Failed to remove cdk.context.json: ${(error as Error).message}`));
                }
            }
        }
    }
}
