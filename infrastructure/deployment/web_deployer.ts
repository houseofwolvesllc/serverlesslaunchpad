import { Environment } from "@houseofwolves/serverlesslaunchpad.core";
import { CloudFormationClient, DescribeStacksCommand } from "@aws-sdk/client-cloudformation";
import chalk from "chalk";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { $ } from "zx";
import { StackManager } from "./stack_manager";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type WebPackageName = "mantine" | "shadcn" | "daisyui" | "svelte";

interface WebPackageConfig {
    name: WebPackageName;
    displayName: string;
    directory: string;
    outputDir: string;
}

interface StackOutputs {
    bucketName: string;
    websiteUrl: string;
}

interface DeploymentResult {
    package: WebPackageName;
    success: boolean;
    url?: string;
    error?: string;
}

/**
 * Handles deployment of web assets to S3 website hosting
 */
export class WebDeployer extends StackManager {
    private readonly webPackages: WebPackageConfig[] = [
        { name: "mantine", displayName: "Mantine", directory: "web.mantine", outputDir: "dist" },
        { name: "shadcn", displayName: "shadcn/ui", directory: "web.shadcn", outputDir: "dist" },
        { name: "daisyui", displayName: "DaisyUI", directory: "web.daisyui", outputDir: "dist" },
        { name: "svelte", displayName: "Svelte", directory: "web.svelte", outputDir: "build" },
    ];

    private cfnClient: CloudFormationClient | null = null;

    constructor() {
        super();
    }

    async run(): Promise<void> {
        try {
            console.log(chalk.bold.blue("\n🌐 Serverless Launchpad Web Deployment Tool 🌐\n"));

            const awsProfile = await this.promptForAwsProfile();
            console.log(chalk.green(`\nUsing AWS profile: ${chalk.bold(awsProfile)}\n`));

            const environment = await this.promptForEnvironment();
            const selectedPackages = await this.promptForWebPackages();

            // Initialize CloudFormation client
            this.cfnClient = new CloudFormationClient({
                region: process.env.AWS_REGION,
            });

            // Verify infrastructure is deployed
            const stackOutputs = await this.verifyInfrastructure(environment, selectedPackages);
            if (Object.keys(stackOutputs).length === 0) {
                console.log(chalk.red("\n❌ No infrastructure stacks found. Run infrastructure deployment first."));
                process.exit(1);
            }

            // Confirm deployment
            if (!(await this.confirmDeployment(environment, selectedPackages, stackOutputs))) {
                console.log(chalk.yellow("\nDeployment cancelled."));
                process.exit(0);
            }

            // Build and deploy
            const results = await this.deployWebPackages(environment, selectedPackages, stackOutputs, awsProfile);

            // Report results
            this.reportResults(results);
        } catch (error) {
            console.error(chalk.red(`\n❌ Error: ${(error as Error).message}`));
            process.exit(1);
        }
    }

    /**
     * Prompt user to select web packages to deploy
     */
    async promptForWebPackages(): Promise<WebPackageName[]> {
        console.log(chalk.cyan("\nSelect web packages to deploy:"));
        console.log(`  ${chalk.green("1")} All packages`);

        this.webPackages.forEach((pkg, index) => {
            console.log(`  ${chalk.green(index + 2)} ${pkg.displayName}`);
        });

        const selection = await this.question(
            chalk.yellow(`\nEnter selection (comma-separated for multiple, e.g., 1 or 2,3,4): `)
        );

        const indices = selection
            .split(",")
            .map((s) => parseInt(s.trim(), 10))
            .filter((i) => !isNaN(i));

        if (indices.includes(1)) {
            return this.webPackages.map((p) => p.name);
        }

        const selectedPackages = indices
            .map((i) => i - 2)
            .filter((i) => i >= 0 && i < this.webPackages.length)
            .map((i) => this.webPackages[i].name);

        if (selectedPackages.length === 0) {
            console.log(chalk.red("Invalid selection. Please try again."));
            return this.promptForWebPackages();
        }

        return selectedPackages;
    }

    /**
     * Verify infrastructure stacks are deployed and get outputs
     */
    async verifyInfrastructure(
        environment: Environment,
        packages: WebPackageName[]
    ): Promise<Record<WebPackageName, StackOutputs>> {
        console.log(chalk.blue("\nVerifying infrastructure stacks..."));

        const outputs: Record<string, StackOutputs> = {};

        for (const pkg of packages) {
            const stackName = `slp-web-${pkg}-stack-${environment}`;
            try {
                const stackOutputs = await this.getStackOutputs(stackName);
                if (stackOutputs) {
                    outputs[pkg] = stackOutputs;
                    console.log(chalk.green(`  ✓ ${stackName}`));
                } else {
                    console.log(chalk.yellow(`  ⚠ ${stackName} - missing outputs`));
                }
            } catch (error: any) {
                if (error.message?.includes("does not exist")) {
                    console.log(chalk.red(`  ✗ ${stackName} - not deployed`));
                } else {
                    console.log(chalk.red(`  ✗ ${stackName} - ${error.message}`));
                }
            }
        }

        return outputs as Record<WebPackageName, StackOutputs>;
    }

    /**
     * Get CloudFormation stack outputs
     */
    private async getStackOutputs(stackName: string): Promise<StackOutputs | null> {
        if (!this.cfnClient) {
            throw new Error("CloudFormation client not initialized");
        }

        const command = new DescribeStacksCommand({ StackName: stackName });
        const response = await this.cfnClient.send(command);

        if (!response.Stacks || response.Stacks.length === 0) {
            return null;
        }

        const outputs = response.Stacks[0].Outputs || [];
        const result: Partial<StackOutputs> = {};

        for (const output of outputs) {
            if (output.OutputKey?.includes("BucketName")) {
                result.bucketName = output.OutputValue;
            } else if (output.OutputKey?.includes("WebsiteURL")) {
                result.websiteUrl = output.OutputValue;
            }
        }

        if (!result.bucketName || !result.websiteUrl) {
            return null;
        }

        return result as StackOutputs;
    }

    /**
     * Confirm deployment with user
     */
    async confirmDeployment(
        environment: Environment,
        packages: WebPackageName[],
        stackOutputs: Record<WebPackageName, StackOutputs>
    ): Promise<boolean> {
        console.log(chalk.cyan(`\nThe following packages will be deployed to ${chalk.bold(environment)}:`));

        for (const pkg of packages) {
            const outputs = stackOutputs[pkg];
            if (outputs) {
                console.log(`  - ${chalk.bold(pkg)}`);
                console.log(chalk.gray(`      Bucket: ${outputs.bucketName}`));
                console.log(chalk.gray(`      Website: ${outputs.websiteUrl}`));
            }
        }

        if (environment === "production") {
            console.log(chalk.yellow("\n⚠️  WARNING: Deploying to PRODUCTION environment!"));
        }

        const confirm = await this.question(chalk.yellow("\nProceed with deployment? (yes/no): "));
        return confirm.toLowerCase() === "yes" || confirm.toLowerCase() === "y";
    }

    /**
     * Build and deploy web packages
     */
    async deployWebPackages(
        environment: Environment,
        packages: WebPackageName[],
        stackOutputs: Record<WebPackageName, StackOutputs>,
        awsProfile: string
    ): Promise<DeploymentResult[]> {
        const results: DeploymentResult[] = [];

        for (const pkgName of packages) {
            const pkg = this.webPackages.find((p) => p.name === pkgName);
            const outputs = stackOutputs[pkgName];

            if (!pkg || !outputs) {
                results.push({
                    package: pkgName,
                    success: false,
                    error: "Stack outputs not found",
                });
                continue;
            }

            console.log(chalk.blue(`\n📦 Deploying ${pkg.displayName}...`));

            // Build
            const buildSuccess = await this.buildPackage(pkg, environment);
            if (!buildSuccess) {
                const shouldContinue = await this.promptContinueOnError(pkg.displayName);
                if (!shouldContinue) {
                    console.log(chalk.yellow("\nDeployment aborted."));
                    process.exit(1);
                }
                results.push({
                    package: pkgName,
                    success: false,
                    error: "Build failed",
                });
                continue;
            }

            // Sync to S3
            const syncSuccess = await this.syncToS3(pkg, outputs.bucketName, awsProfile);
            if (!syncSuccess) {
                results.push({
                    package: pkgName,
                    success: false,
                    error: "S3 sync failed",
                });
                continue;
            }

            results.push({
                package: pkgName,
                success: true,
                url: outputs.websiteUrl,
            });
        }

        return results;
    }

    /**
     * Build a web package
     */
    private async buildPackage(pkg: WebPackageConfig, environment: Environment): Promise<boolean> {
        const pkgPath = path.resolve(__dirname, `../../${pkg.directory}`);
        const buildCommand = `build:${environment}`;

        console.log(chalk.gray(`  [${pkg.name}] Building for ${environment}...`));

        try {
            // Check if package directory exists
            if (!fs.existsSync(pkgPath)) {
                console.log(chalk.red(`  [${pkg.name}] ✗ Package directory not found: ${pkgPath}`));
                return false;
            }

            // Run build
            const previousVerbose = $.verbose;
            $.verbose = false;

            await $`cd ${pkgPath} && npm run ${buildCommand}`;

            $.verbose = previousVerbose;

            // Verify output exists
            const outputPath = path.join(pkgPath, pkg.outputDir);
            if (!fs.existsSync(outputPath)) {
                console.log(chalk.red(`  [${pkg.name}] ✗ Build output not found: ${outputPath}`));
                return false;
            }

            console.log(chalk.green(`  [${pkg.name}] ✓ Build completed`));
            return true;
        } catch (error: any) {
            console.log(chalk.red(`  [${pkg.name}] ✗ Build failed`));
            console.log(chalk.gray(`  Error: ${error.message}`));
            return false;
        }
    }

    /**
     * Sync build output to S3
     */
    private async syncToS3(pkg: WebPackageConfig, bucketName: string, awsProfile: string): Promise<boolean> {
        const pkgPath = path.resolve(__dirname, `../../${pkg.directory}`);
        const outputPath = path.join(pkgPath, pkg.outputDir);

        console.log(chalk.gray(`  [${pkg.name}] Syncing to s3://${bucketName}...`));

        try {
            const previousVerbose = $.verbose;
            $.verbose = false;

            await $`AWS_PROFILE=${awsProfile} aws s3 sync ${outputPath}/ s3://${bucketName}/ --delete`;

            $.verbose = previousVerbose;

            console.log(chalk.green(`  [${pkg.name}] ✓ S3 sync completed`));
            return true;
        } catch (error: any) {
            console.log(chalk.red(`  [${pkg.name}] ✗ S3 sync failed`));
            console.log(chalk.gray(`  Error: ${error.message}`));
            return false;
        }
    }

    /**
     * Prompt user to continue after error
     */
    private async promptContinueOnError(packageName: string): Promise<boolean> {
        console.log(chalk.yellow(`\nBuild failed for ${packageName}.`));
        console.log(`  ${chalk.green("1")} Skip and continue with other packages`);
        console.log(`  ${chalk.green("2")} Abort deployment`);

        const choice = await this.question(chalk.yellow("\nEnter choice [1-2]: "));
        return choice === "1";
    }

    /**
     * Report deployment results
     */
    private reportResults(results: DeploymentResult[]): void {
        const successful = results.filter((r) => r.success);
        const failed = results.filter((r) => !r.success);

        console.log(chalk.bold("\n" + "=".repeat(60)));

        if (successful.length > 0) {
            console.log(chalk.green.bold("\n✅ Successfully deployed:"));
            for (const result of successful) {
                console.log(`  ${chalk.bold(result.package)}: ${chalk.cyan(result.url)}`);
            }
        }

        if (failed.length > 0) {
            console.log(chalk.red.bold("\n❌ Failed deployments:"));
            for (const result of failed) {
                console.log(`  ${chalk.bold(result.package)}: ${result.error}`);
            }
        }

        console.log(chalk.bold("\n" + "=".repeat(60)));

        if (failed.length === 0) {
            console.log(chalk.green.bold("\n🎉 Web deployment completed successfully!\n"));
        } else if (successful.length > 0) {
            console.log(chalk.yellow.bold("\n⚠️ Web deployment completed with some failures.\n"));
        } else {
            console.log(chalk.red.bold("\n❌ Web deployment failed.\n"));
            process.exit(1);
        }
    }
}
