/**
 * Merge web.commons.react into web/src step
 *
 * Copies web.commons.react to web/src/commons-react/ to avoid conflicts
 * and maintain clean separation.
 */
import path from "path";
import { ScaffoldingConfig, StepResult } from "../types";
import { copyDirectory, pathExists, readFile, writeFile, glob } from "../utils/file_operations";
import { log } from "../utils/logger";

/**
 * Copy web.commons.react/src to web/src/commons-react/
 */
export async function mergeCommonsReact(config: ScaffoldingConfig): Promise<StepResult> {
    log.section("🔗", "Copying web.commons.react...");

    const commonsReactRoot = path.join(config.sourceRoot, "web.commons.react", "src");
    const targetRoot = path.join(config.outputPath, "web", "src", "commons-react");

    if (!(await pathExists(commonsReactRoot))) {
        log.warning("web.commons.react/src not found, skipping");
        return { success: true, filesProcessed: 0 };
    }

    // For Svelte, skip the React-specific components
    if (config.webFramework === "svelte") {
        log.success("Skipped (Svelte project - no React dependencies needed)");
        return { success: true, filesProcessed: 0 };
    }

    // Copy entire web.commons.react/src to web/src/commons-react/
    const fileCount = await copyDirectory(commonsReactRoot, targetRoot);

    // Update imports in the copied files to use new package name
    const oldPackage = "@houseofwolves/serverlesslaunchpad";
    const newPackage = `${config.projectScope}/${config.projectBaseName}`;

    // Update all .ts and .tsx files in the copied directory
    const files = await glob(targetRoot, ["*.ts", "*.tsx"]);
    for (const file of files) {
        let content = await readFile(file);
        if (content && content.includes(oldPackage)) {
            content = content.replace(
                new RegExp(oldPackage.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
                newPackage
            );
            await writeFile(file, content);
        }
    }

    log.success(`Copied ${fileCount} files to commons-react/`);

    return {
        success: true,
        filesProcessed: fileCount,
    };
}
