/**
 * CLI prompts for scaffolding configuration
 */
import { execSync } from "child_process";
import inquirer from "inquirer";
import path from "path";
import { ScaffoldingConfig, WebFramework } from "./types";
import { log } from "./utils/logger";

/**
 * Get author name from git config
 */
function getGitAuthor(): string {
    try {
        return execSync("git config user.name", { encoding: "utf-8" }).trim();
    } catch {
        return "";
    }
}

/**
 * Validate npm package name format
 */
function isValidPackageName(name: string): boolean {
    // Must be scoped: @scope/package-name
    const scopedPattern = /^@[a-z0-9-~][a-z0-9-._~]*\/[a-z0-9-~][a-z0-9-._~]*$/;
    return scopedPattern.test(name);
}

/**
 * Reserved ports that should not be used
 */
const RESERVED_PORTS = [3000, 3306, 5432, 5173, 8080, 8443, 9229];

/**
 * Check if a port is currently in use on the host
 */
function isPortInUse(port: number): boolean {
    try {
        execSync(`lsof -i :${port}`, { encoding: "utf-8", stdio: "pipe" });
        return true;
    } catch {
        return false;
    }
}

/**
 * Port allocation: base=PostgreSQL, +1=API, +2=Web, +3=Moto, +4=Cognito
 */
const PORT_LABELS = ["PostgreSQL (base)", "API (base+1)", "Web (base+2)", "Moto (base+3)", "Cognito (base+4)"];
const PORT_COUNT = PORT_LABELS.length;

/**
 * Find a suggested base port that avoids reserved and in-use ports
 */
function findSuggestedPort(startFrom: number): number {
    for (let candidate = startFrom; candidate <= 49151 - PORT_COUNT + 1; candidate++) {
        const ports = Array.from({ length: PORT_COUNT }, (_, i) => candidate + i);
        const hasConflict = ports.some(
            (p) => RESERVED_PORTS.includes(p) || isPortInUse(p)
        );
        if (!hasConflict) {
            return candidate;
        }
    }
    return 6000; // fallback
}

/**
 * Validate a base port number and its derived ports (base through base+4)
 */
function validateBasePort(input: string): true | string {
    const port = parseInt(input, 10);
    if (isNaN(port)) {
        return "Must be a valid number";
    }
    if (port < 3000 || port > 49151) {
        return "Must be between 3000 and 49151";
    }
    if (port + PORT_COUNT - 1 > 49151) {
        return `Port ${port + PORT_COUNT - 1} (base+${PORT_COUNT - 1}) exceeds maximum 49151`;
    }

    const ports = Array.from({ length: PORT_COUNT }, (_, i) => port + i);

    for (let i = 0; i < ports.length; i++) {
        if (RESERVED_PORTS.includes(ports[i])) {
            const suggestion = findSuggestedPort(port + 1);
            return `Port ${ports[i]} (${PORT_LABELS[i]}) is reserved. Try ${suggestion}`;
        }
    }

    for (let i = 0; i < ports.length; i++) {
        if (isPortInUse(ports[i])) {
            const suggestion = findSuggestedPort(port + 1);
            return `Port ${ports[i]} (${PORT_LABELS[i]}) is already in use. Try ${suggestion}`;
        }
    }

    return true;
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
            default: "../my-awesome-project",
            validate: (input: string) => {
                if (!input.trim()) {
                    return "Path is required";
                }
                return true;
            },
        },
        {
            type: "input",
            name: "projectName",
            message: "What is the project name?",
            default: (answers: Record<string, string>) => {
                const folderName = path.basename(answers.outputPath.trim());
                return `@acme/${folderName}`;
            },
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
            message: "What is the display name?",
            default: (answers: Record<string, string>) => {
                // Convert @acme/my-awesome-project to My Awesome Project
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
                    return baseName.replace(/-/g, "").slice(0, 3).toLowerCase();
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
            message: "What configuration domain?",
            default: (answers: Record<string, string>) => {
                try {
                    const { scope, baseName } = parsePackageName(answers.projectName);
                    // Convert @acme/my-awesome-project to my-awesome-project.acme.com
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
            type: "input",
            name: "author",
            message: "Who is the author?",
            default: getGitAuthor(),
            validate: (input: string) => {
                if (!input.trim()) {
                    return "Author is required";
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
        {
            type: "input",
            name: "basePort",
            message:
                "What base port for local Docker development? (5 sequential ports: PostgreSQL, API, Web, Moto, Cognito)",
            default: 6000,
            validate: validateBasePort,
            filter: (input: string) => parseInt(input, 10),
        },
    ]);

    const { scope, baseName, dotted } = parsePackageName(answers.projectName.trim());
    const outputPathInput = answers.outputPath.trim();

    return {
        outputPath: path.resolve(outputPathInput),
        outputPathDisplay: outputPathInput,
        projectName: answers.projectName.trim(),
        projectScope: scope,
        projectBaseName: baseName,
        projectNameDotted: dotted,
        projectDisplayName: answers.projectDisplayName.trim(),
        resourcePrefix: answers.resourcePrefix.trim(),
        configDomain: answers.configDomain.trim(),
        author: answers.author.trim(),
        webFramework: answers.webFramework as WebFramework,
        basePort: answers.basePort as number,
        sourceRoot,
    };
}
