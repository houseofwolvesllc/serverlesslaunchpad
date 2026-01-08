/**
 * Transform import paths step
 */
import path from "path";
import { ScaffoldingConfig, StepResult } from "../types";
import { glob, readFile, writeFile } from "../utils/file_operations";
import { rewriteImports, updatePackageImports } from "../utils/import_rewriter";
import { log } from "../utils/logger";

/**
 * Transform import paths in web/src files
 */
export async function transformImports(config: ScaffoldingConfig): Promise<StepResult> {
    log.section("🔧", "Transforming import paths...");

    const webSrcDir = path.join(config.outputPath, "web", "src");

    // Find all TypeScript files
    const files = await glob(webSrcDir, ["*.ts", "*.tsx"]);

    let filesModified = 0;

    for (const file of files) {
        let content = await readFile(file);
        let modified = false;

        // Rewrite imports from web.commons packages to relative paths
        const rewriteResult = rewriteImports(content, file, webSrcDir, config.projectScope, config.projectBaseName);

        if (rewriteResult.modified) {
            content = rewriteResult.content;
            modified = true;
        }

        // Update package import references
        const updateResult = updatePackageImports(
            content,
            "@houseofwolves",
            "serverlesslaunchpad",
            config.projectScope,
            config.projectBaseName
        );

        if (updateResult.modified) {
            content = updateResult.content;
            modified = true;
        }

        if (modified) {
            await writeFile(file, content);
            filesModified++;
        }
    }

    // Also update imports in other packages (core, framework, etc.)
    const otherPackages = ["api.hypermedia", "core", "framework", "infrastructure", "types"];

    for (const pkg of otherPackages) {
        const pkgDir = path.join(config.outputPath, pkg, "src");
        const pkgFiles = await glob(pkgDir, ["*.ts", "*.tsx"]);

        for (const file of pkgFiles) {
            let content = await readFile(file);

            const updateResult = updatePackageImports(
                content,
                "@houseofwolves",
                "serverlesslaunchpad",
                config.projectScope,
                config.projectBaseName
            );

            if (updateResult.modified) {
                await writeFile(file, updateResult.content);
                filesModified++;
            }
        }
    }

    log.success(`${filesModified} files updated`);

    return {
        success: true,
        filesProcessed: filesModified,
    };
}
