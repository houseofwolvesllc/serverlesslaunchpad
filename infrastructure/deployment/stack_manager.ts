import { Environment } from "@houseofwolves/serverlesslaunchpad.core";
import chalk from "chalk";
import { createInterface } from "readline";
import { $ } from "zx";

export interface StackInfo {
    name: string;
    displayName: string;
    dependencies?: string[];
}

/**
 * Base class for stack management operations
 * Provides common functionality for deployment and destruction
 */
export abstract class StackManager {
    protected stacksCache: string[] | null = null;

    constructor() {
        $.verbose = false;
    }

    /**
     * Get interactive user input
     */
    async question(query: string): Promise<string> {
        const readline = createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        try {
            return await new Promise((resolve) => {
                readline.question(query, (answer) => {
                    resolve(answer);
                });
            });
        } finally {
            readline.close();
        }
    }

    /**
     * Get available AWS profiles
     */
    async getAwsProfiles(): Promise<string[]> {
        try {
            const { stdout } = await $`aws configure list-profiles`;
            return stdout
                .split("\n")
                .map((profile) => profile.trim())
                .filter(Boolean);
        } catch (error) {
            console.error(chalk.red(`Error fetching AWS profiles: ${(error as Error).message}`));
            return [];
        }
    }

    /**
     * Prompt user to select AWS profile
     */
    async promptForAwsProfile(): Promise<string> {
        console.log(chalk.cyan("Please select an AWS profile to use:"));

        const profiles = await this.getAwsProfiles();

        if (profiles.length === 0) {
            console.log(chalk.yellow("No AWS profiles found. Make sure AWS CLI is installed and configured."));
            const manualProfile = await this.question(
                chalk.yellow("Enter profile name manually or press Enter for default: ")
            );
            return manualProfile || "default";
        }

        for (let i = 0; i < profiles.length; i++) {
            console.log(`  ${chalk.green(i + 1)}) ${profiles[i]}`);
        }

        const selection = await this.question(chalk.yellow(`\nEnter number [1-${profiles.length}]: `));
        const index = parseInt(selection, 10) - 1;

        if (isNaN(index) || index < 0 || index >= profiles.length) {
            console.log(chalk.red("Invalid selection. Please enter a valid number."));
            return this.promptForAwsProfile();
        }

        const selectedProfile = profiles[index];

        // Verify profile works
        try {
            await $`AWS_PROFILE=${selectedProfile} aws sts get-caller-identity`;
            return selectedProfile;
        } catch (error) {
            console.log(chalk.red(`Profile "${selectedProfile}" appears to be invalid or lacks proper credentials.`));
            console.log(chalk.yellow("Would you like to try a different profile?"));

            const retry = await this.question(chalk.yellow("Try again? (yes/no): "));
            if (retry.toLowerCase() === "yes" || retry.toLowerCase() === "y") {
                return this.promptForAwsProfile();
            }

            throw new Error("No valid AWS profile selected");
        }
    }

    /**
     * Prompt user to select environment
     */
    async promptForEnvironment(): Promise<Environment> {
        console.log(chalk.cyan("\nSelect deployment environment:"));
        console.log(`  ${chalk.green("1")} development`);
        console.log(`  ${chalk.green("2")} staging`);
        console.log(`  ${chalk.green("3")} production`);

        const selection = await this.question(chalk.yellow("\nEnter number [1-3]: "));
        const environments: Environment[] = [Environment.Development, Environment.Staging, Environment.Production];
        const index = parseInt(selection, 10) - 1;

        if (index >= 0 && index < environments.length) {
            return environments[index];
        }

        console.log(chalk.red("Invalid selection. Please enter 1, 2, or 3."));
        return this.promptForEnvironment();
    }

    /**
     * Get available stacks for deployment
     */
    getAvailableStacks(): StackInfo[] {
        return [
            { name: "secrets", displayName: "Secrets Manager" },
            { name: "data", displayName: "Athena Data Infrastructure" },
            { name: "auth", displayName: "Cognito Authentication" },
            { name: "alb", displayName: "Application Load Balancer", dependencies: ["auth", "data"] },
            { name: "lambda", displayName: "Lambda Functions", dependencies: ["alb", "secrets"] },
        ];
    }

    /**
     * Prompt user to select which services to deploy
     */
    async promptForServices(action: "deploy" | "destroy"): Promise<string[]> {
        const stacks = this.getAvailableStacks();

        console.log(chalk.cyan(`\nSelect stacks to ${action}:`));
        console.log(`  ${chalk.green("1")} All stacks`);

        stacks.forEach((stack, index) => {
            const deps = stack.dependencies ? ` (depends on: ${stack.dependencies.join(", ")})` : "";
            console.log(`  ${chalk.green(index + 2)} ${stack.displayName}${deps}`);
        });

        const selection = await this.question(
            chalk.yellow(`\nEnter selection (comma-separated for multiple, e.g., 1,3,5): `)
        );

        const indices = selection
            .split(",")
            .map((s) => parseInt(s.trim(), 10) - 1)
            .filter((i) => !isNaN(i));

        if (indices.includes(0)) {
            // "All" selected
            return stacks.map((s) => s.name);
        }

        const selectedStacks = indices
            .map((i) => i - 1) // Adjust for "All" option
            .filter((i) => i >= 0 && i < stacks.length)
            .map((i) => stacks[i].name);

        if (selectedStacks.length === 0) {
            console.log(chalk.red("Invalid selection. Please try again."));
            return this.promptForServices(action);
        }

        return selectedStacks;
    }

    /**
     * List CDK stacks based on environment and services
     */
    async listStacks(environment: Environment, services: string[], awsProfile: string): Promise<string[]> {
        if (this.stacksCache) {
            return this.filterStacks(this.stacksCache, environment, services);
        }

        try {
            const { stdout } = await $`AWS_PROFILE=${awsProfile} npx cdk list`;
            this.stacksCache = stdout
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean);

            return this.filterStacks(this.stacksCache, environment, services);
        } catch (error) {
            console.error(chalk.red(`Error listing stacks: ${(error as Error).message}`));
            return [];
        }
    }

    /**
     * Filter stacks based on environment and services
     */
    private filterStacks(allStacks: string[], environment: Environment, services: string[]): string[] {
        return allStacks.filter((stack) => {
            // Check if stack matches environment
            if (!stack.includes(environment)) {
                return false;
            }

            // If all services selected, include all stacks
            if (services.length === this.getAvailableStacks().length) {
                return true;
            }

            // Check if stack matches any selected service
            return services.some((service) => stack.toLowerCase().includes(service.toLowerCase()));
        });
    }

    /**
     * Bootstrap CDK environment if needed
     */
    async bootstrapEnvironment(awsProfile: string): Promise<void> {
        try {
            console.log(chalk.blue("\nChecking CDK bootstrap status..."));

            // Try to get bootstrap stack status
            const { stdout } =
                await $`AWS_PROFILE=${awsProfile} aws cloudformation describe-stacks --stack-name CDKToolkit 2>/dev/null || echo "NOT_FOUND"`;

            if (stdout.includes("NOT_FOUND")) {
                console.log(chalk.yellow("CDK bootstrap required. Running bootstrap..."));
                await $`AWS_PROFILE=${awsProfile} npx cdk bootstrap`;
                console.log(chalk.green("✅ CDK bootstrap completed"));
            } else {
                console.log(chalk.green("✅ CDK already bootstrapped"));
            }
        } catch (error) {
            console.error(chalk.yellow(`⚠️ Warning: Bootstrap check failed: ${(error as Error).message}`));
            // Non-fatal - continue with deployment
        }
    }
}
