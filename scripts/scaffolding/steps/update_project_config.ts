/**
 * Update project.config.json step
 */
import path from "path";
import { ScaffoldingConfig, StepResult } from "../types";
import { writeFile } from "../utils/file_operations";
import { log } from "../utils/logger";

/**
 * Generate project.config.json content
 */
function generateProjectConfig(config: ScaffoldingConfig): string {
    const projectConfig = {
        packageScope: config.projectScope,
        packageName: config.projectBaseName,
        displayName: config.projectDisplayName,
        resourcePrefix: config.resourcePrefix,
        tablePrefix: config.resourcePrefix,
        configDomain: config.configDomain,
    };

    return JSON.stringify(projectConfig, null, 4);
}

/**
 * Update project.config.json with new project configuration
 */
export async function updateProjectConfig(config: ScaffoldingConfig): Promise<StepResult> {
    log.section("🏗️", "Updating project config...");

    const configPath = path.join(config.outputPath, "project.config.json");

    const content = generateProjectConfig(config);
    await writeFile(configPath, content);

    log.success("project.config.json");

    return {
        success: true,
        filesProcessed: 1,
    };
}
