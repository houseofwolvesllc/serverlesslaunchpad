/**
 * Copy core packages step
 */
import path from "path";
import { ScaffoldingConfig, StepResult } from "../types";
import { copyDirectory, copyFile, pathExists } from "../utils/file_operations";
import { log } from "../utils/logger";

/**
 * Core packages to copy (not web packages)
 */
const CORE_PACKAGES = ["api.hypermedia", "core", "framework", "infrastructure", "moto", "types"];

/**
 * Root configuration files to copy
 */
const ROOT_FILES = [
    "package.json",
    ".nvmrc",
    ".prettierrc.json",
    ".gitignore",
    ".eslintrc.json",
    "tsconfig.json",
    "Makefile",
    "docker-compose.moto.yml",
];

/**
 * Copy core packages to target directory
 */
export async function copyPackages(config: ScaffoldingConfig): Promise<StepResult> {
    log.section("📦", "Copying core packages...");

    let totalFiles = 0;

    for (const pkg of CORE_PACKAGES) {
        const source = path.join(config.sourceRoot, pkg);
        const target = path.join(config.outputPath, pkg);

        const fileCount = await copyDirectory(source, target);
        totalFiles += fileCount;
        log.success(pkg);
    }

    // Copy root configuration files
    for (const file of ROOT_FILES) {
        const source = path.join(config.sourceRoot, file);
        const target = path.join(config.outputPath, file);

        if (await pathExists(source)) {
            await copyFile(source, target);
            totalFiles++;
        }
    }

    return {
        success: true,
        filesProcessed: totalFiles,
    };
}
