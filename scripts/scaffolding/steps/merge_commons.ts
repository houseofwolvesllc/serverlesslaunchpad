/**
 * Merge web.commons into web/src step
 *
 * Instead of trying to merge files with potential conflicts, we copy
 * web.commons to its own subfolder (web/src/commons/) and update imports.
 */
import path from "path";
import { ScaffoldingConfig, StepResult } from "../types";
import { copyDirectory, pathExists, readFile, writeFile } from "../utils/file_operations";
import { log } from "../utils/logger";

/**
 * Copy web.commons/src to web/src/commons/
 */
export async function mergeCommons(config: ScaffoldingConfig): Promise<StepResult> {
    log.section("🔗", "Copying web.commons...");

    const commonsRoot = path.join(config.sourceRoot, "web.commons", "src");
    const targetRoot = path.join(config.outputPath, "web", "src", "commons");

    if (!(await pathExists(commonsRoot))) {
        log.warning("web.commons/src not found, skipping");
        return { success: true, filesProcessed: 0 };
    }

    // Copy entire web.commons/src to web/src/commons/
    const fileCount = await copyDirectory(commonsRoot, targetRoot);

    // Update imports in the copied files to use new package name
    const oldPackage = "@houseofwolves/serverlesslaunchpad";
    const newPackage = `${config.projectScope}/${config.projectBaseName}`;

    // Update the index.ts imports that reference the types package
    const indexPath = path.join(targetRoot, "index.ts");
    if (await pathExists(indexPath)) {
        let indexContent = await readFile(indexPath);
        if (indexContent) {
            indexContent = indexContent.replace(
                new RegExp(oldPackage.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
                newPackage
            );
            await writeFile(indexPath, indexContent);
        }
    }

    log.success(`Copied ${fileCount} files to commons/`);

    return {
        success: true,
        filesProcessed: fileCount,
    };
}
