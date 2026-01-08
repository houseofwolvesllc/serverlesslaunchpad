/**
 * Finalization step for scaffolding
 */
import path from "path";
import { ScaffoldingConfig, StepResult } from "../types";
import { removeEmptyDirs, pathExists } from "../utils/file_operations";
import { log } from "../utils/logger";

/**
 * Critical files that must exist after scaffolding
 */
const CRITICAL_FILES = [
    "package.json",
    "project.config.json",
    "core/package.json",
    "framework/package.json",
    "infrastructure/package.json",
    "web/package.json",
    "api.hypermedia/package.json",
];

/**
 * Finalize the scaffolding process
 */
export async function finalize(config: ScaffoldingConfig): Promise<StepResult> {
    // Clean up empty directories
    await removeEmptyDirs(config.outputPath);

    // Verify critical files exist
    const missingFiles: string[] = [];
    for (const file of CRITICAL_FILES) {
        const filePath = path.join(config.outputPath, file);
        if (!(await pathExists(filePath))) {
            missingFiles.push(file);
        }
    }

    if (missingFiles.length > 0) {
        log.error("Missing critical files:");
        for (const file of missingFiles) {
            log.error(`  - ${file}`);
        }
        return {
            success: false,
            message: `Missing ${missingFiles.length} critical files`,
        };
    }

    // Display success message
    log.complete(`Project created successfully at ${config.outputPath}`);

    console.log("Next steps:");
    console.log(`  cd ${config.outputPath}`);
    console.log("  npm install");
    console.log("  npm run dev");
    console.log();

    return {
        success: true,
    };
}
