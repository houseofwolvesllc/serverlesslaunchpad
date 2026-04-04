import { ProjectConfig, ProjectConfigSchema, getConfigFilename, getKmsKeyAlias } from "@houseofwolves/serverlesslaunchpad.types";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load project configuration.
 *
 * In Lambda: reads from environment variables injected by CDK at deploy time.
 * In local dev: reads from project.config.json at the monorepo root.
 */
export function loadProjectConfig(): ProjectConfig {
    // Lambda environment — CDK injects these at deploy time
    if (process.env.PROJECT_TABLE_PREFIX && process.env.PROJECT_CONFIG_DOMAIN) {
        return ProjectConfigSchema.parse({
            packageScope: process.env.PROJECT_PACKAGE_SCOPE ?? "@houseofwolves",
            packageName: process.env.PROJECT_PACKAGE_NAME ?? "serverlesslaunchpad",
            displayName: process.env.PROJECT_DISPLAY_NAME ?? "Serverless Launchpad",
            resourcePrefix: process.env.PROJECT_TABLE_PREFIX,
            tablePrefix: process.env.PROJECT_TABLE_PREFIX,
            configDomain: process.env.PROJECT_CONFIG_DOMAIN,
        });
    }

    // Local dev — read from project.config.json at monorepo root
    // From api.hypermedia/src/ or api.hypermedia/dist/: ../.. reaches monorepo root
    const configPath = path.resolve(__dirname, "../..", "project.config.json");

    if (!fs.existsSync(configPath)) {
        throw new Error(
            `Project configuration not found. Set PROJECT_TABLE_PREFIX and PROJECT_CONFIG_DOMAIN ` +
            `environment variables, or ensure project.config.json exists at ${configPath}.`
        );
    }

    const rawConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    return ProjectConfigSchema.parse(rawConfig);
}

/**
 * Cached project config instance
 */
let cachedConfig: ProjectConfig | null = null;

/**
 * Get project config (cached after first load)
 */
export function getProjectConfig(): ProjectConfig {
    if (!cachedConfig) {
        cachedConfig = loadProjectConfig();
    }
    return cachedConfig;
}

// Re-export helpers for convenience
export { getConfigFilename, getKmsKeyAlias };
