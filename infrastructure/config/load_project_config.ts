import { ProjectConfig, ProjectConfigSchema, getKmsKeyAlias } from "@houseofwolves/serverlesslaunchpad.types";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load and validate project.config.json from the monorepo root.
 * This is loaded synchronously at CDK synth time.
 */
export function loadProjectConfig(): ProjectConfig {
    // Navigate from infrastructure/config to monorepo root
    const configPath = path.resolve(__dirname, "../../..", "project.config.json");

    if (!fs.existsSync(configPath)) {
        throw new Error(`Project configuration not found at ${configPath}. Ensure project.config.json exists at the monorepo root.`);
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
export { getKmsKeyAlias };
