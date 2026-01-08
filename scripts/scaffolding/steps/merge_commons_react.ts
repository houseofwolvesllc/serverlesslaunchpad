/**
 * Merge web.commons.react into web/src step
 */
import path from "path";
import { ScaffoldingConfig, StepResult } from "../types";
import { copyDirectory, copyFile, pathExists } from "../utils/file_operations";
import { log } from "../utils/logger";

/**
 * Directories to merge for React projects
 */
const REACT_DIRECTORIES = ["field-rendering", "hal-resource", "navigation"];

/**
 * Pure TypeScript files to copy for Svelte (no React dependencies)
 */
const SVELTE_PURE_TS_FILES = [
    "field-rendering/field_rendering_utils.ts",
    "field-rendering/index.ts",
    "hal-resource/resource_utils.ts",
    "navigation/types.ts",
    "navigation/adapters/sitemap_adapter.ts",
    "navigation/utils/hal_helpers.ts",
];

/**
 * Merge web.commons.react/src into web/src
 */
export async function mergeCommonsReact(config: ScaffoldingConfig): Promise<StepResult> {
    log.section("🔗", "Merging web.commons.react...");

    const commonsReactRoot = path.join(config.sourceRoot, "web.commons.react", "src");
    const webSrcRoot = path.join(config.outputPath, "web", "src");

    let totalFiles = 0;

    if (config.webFramework === "svelte") {
        // Svelte: only copy pure TypeScript utilities
        for (const file of SVELTE_PURE_TS_FILES) {
            const source = path.join(commonsReactRoot, file);
            const target = path.join(webSrcRoot, file);

            if (await pathExists(source)) {
                await copyFile(source, target);
                totalFiles++;
            }
        }
        log.success(`Copied ${totalFiles} pure TS files (React files skipped)`);
    } else {
        // React: copy all directories
        for (const dir of REACT_DIRECTORIES) {
            const source = path.join(commonsReactRoot, dir);
            const target = path.join(webSrcRoot, dir);

            if (!(await pathExists(source))) {
                log.warning(`Skipped ${dir} (not found)`);
                continue;
            }

            const fileCount = await copyDirectory(source, target);
            totalFiles += fileCount;
            log.success(dir);
        }
    }

    return {
        success: true,
        filesProcessed: totalFiles,
    };
}
