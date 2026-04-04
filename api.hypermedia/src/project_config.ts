import { ProjectConfig, ProjectConfigSchema, getConfigFilename, getKmsKeyAlias } from "@houseofwolves/serverlesslaunchpad.types";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load and validate project.config.json from the monorepo root.
 * This is loaded synchronously at application startup.
 */
export function loadProjectConfig(): ProjectConfig {
    // Check multiple locations:
    // 1. Same directory as bundle (Lambda: /var/task/project.config.json)
    // 2. Navigate from api.hypermedia/src/ to monorepo root (local dev via tsx)
    // 3. Navigate from api.hypermedia/dist/ to monorepo root (local dev compiled)
    const candidates = [
        path.resolve(__dirname, "project.config.json"),
        path.resolve(__dirname, "../..", "project.config.json"),
        path.resolve(__dirname, "../../..", "project.config.json"),
    ];

    const configPath = candidates.find(p => fs.existsSync(p));

    if (!configPath) {
        throw new Error(`Project configuration not found. Searched: ${candidates.join(", ")}. Ensure project.config.json exists at the monorepo root.`);
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
