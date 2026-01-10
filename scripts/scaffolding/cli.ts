/**
 * CLI prompts for scaffolding configuration
 */
import inquirer from "inquirer";
import path from "path";
import { ScaffoldingConfig, WebFramework } from "./types";
import { log } from "./utils/logger";

/**
 * Validate npm package name format
 */
function isValidPackageName(name: string): boolean {
    // Must be scoped: @scope/package-name
    const scopedPattern = /^@[a-z0-9-~][a-z0-9-._~]*\/[a-z0-9-~][a-z0-9-._~]*$/;
    return scopedPattern.test(name);
}

/**
 * Validate resource prefix format
 */
function isValidResourcePrefix(prefix: string): boolean {
    // 2-8 lowercase alphanumeric characters
    return /^[a-z0-9]{2,8}$/.test(prefix);
}

/**
 * Parse package name into components
 */
function parsePackageName(name: string): { scope: string; baseName: string; dotted: string } {
    const match = name.match(/^(@[^/]+)\/(.+)$/);
    if (!match) {
        throw new Error(`Invalid package name: ${name}`);
    }

    const scope = match[1];
    const baseName = match[2];
    // Convert @mycompany/myapp to mycompany.myapp
    const dotted = `${scope.slice(1)}.${baseName}`;

    return { scope, baseName, dotted };
}

/**
 * Prompt for all configuration options
 */
export async function promptForConfig(sourceRoot: string): Promise<ScaffoldingConfig> {
    log.title("🚀 Serverless Launchpad Project Scaffolding");

    const answers = await inquirer.prompt([
        {
            type: "input",
            name: "outputPath",
            message: "Where should the new project be created?",
            default: path.join(process.cwd(), "..", "my-new-project"),
            validate: (input: string) => {
                if (!input.trim()) {
                    return "Path is required";
                }
                return true;
            },
            filter: (input: string) => path.resolve(input.trim()),
        },
        {
            type: "input",
            name: "projectName",
            message: "What is the project name? (e.g., @acme/inventory-app)",
            validate: (input: string) => {
                if (!isValidPackageName(input.trim())) {
                    return "Project name must be a valid scoped npm package name (e.g., @scope/package-name)";
                }
                return true;
            },
        },
        {
            type: "input",
            name: "projectDisplayName",
            message: "What is the display name? (e.g., Inventory App)",
            default: (answers: Record<string, string>) => {
                // Convert @acme/inventory-app to Inventory App
                try {
                    const { baseName } = parsePackageName(answers.projectName);
                    return baseName
                        .split("-")
                        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(" ");
                } catch {
                    return "";
                }
            },
            validate: (input: string) => {
                if (!input.trim()) {
                    return "Display name is required";
                }
                return true;
            },
        },
        {
            type: "input",
            name: "resourcePrefix",
            message: "What resource prefix to use for AWS resources? (2-8 lowercase alphanumeric)",
            default: (answers: Record<string, string>) => {
                // Extract a short prefix from the package name
                try {
                    const { baseName } = parsePackageName(answers.projectName);
                    // Take first 3-4 chars of the base name
                    return baseName.replace(/-/g, "").slice(0, 4).toLowerCase();
                } catch {
                    return "app";
                }
            },
            validate: (input: string) => {
                if (!isValidResourcePrefix(input.trim())) {
                    return "Resource prefix must be 2-8 lowercase alphanumeric characters";
                }
                return true;
            },
        },
        {
            type: "input",
            name: "configDomain",
            message: "What configuration domain? (e.g., inventory.acme.com)",
            default: (answers: Record<string, string>) => {
                try {
                    const { scope, baseName } = parsePackageName(answers.projectName);
                    // Convert @acme/inventory to inventory.acme.com
                    return `${baseName.replace(/-/g, "")}.${scope.slice(1)}.com`;
                } catch {
                    return "app.example.com";
                }
            },
            validate: (input: string) => {
                if (!input.trim()) {
                    return "Configuration domain is required";
                }
                return true;
            },
        },
        {
            type: "list",
            name: "webFramework",
            message: "Which web UI framework would you like to use?",
            choices: [
                { name: "mantine (React + Mantine UI)", value: "mantine" },
                { name: "shadcn (React + shadcn/ui + Tailwind)", value: "shadcn" },
                { name: "daisyui (React + DaisyUI + Tailwind)", value: "daisyui" },
                { name: "svelte (SvelteKit)", value: "svelte" },
            ],
            default: "mantine",
        },
    ]);

    const { scope, baseName, dotted } = parsePackageName(answers.projectName.trim());

    return {
        outputPath: answers.outputPath,
        projectName: answers.projectName.trim(),
        projectScope: scope,
        projectBaseName: baseName,
        projectNameDotted: dotted,
        projectDisplayName: answers.projectDisplayName.trim(),
        resourcePrefix: answers.resourcePrefix.trim(),
        configDomain: answers.configDomain.trim(),
        webFramework: answers.webFramework as WebFramework,
        sourceRoot,
    };
}
