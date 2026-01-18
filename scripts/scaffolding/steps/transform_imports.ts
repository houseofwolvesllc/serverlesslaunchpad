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

    // Find all TypeScript and Svelte files
    const files = await glob(webSrcDir, ["*.ts", "*.tsx", "*.svelte"]);

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

    // Transform docker-compose
    const dockerComposePath = path.join(config.outputPath, "docker-compose.moto.yml");
    let dockerContent = await readFile(dockerComposePath);
    if (dockerContent) {
        const newDockerContent = dockerContent.replace(/serverlesslaunchpad/g, config.projectBaseName);
        if (newDockerContent !== dockerContent) {
            await writeFile(dockerComposePath, newDockerContent);
            filesModified++;
        }
    }

    // Transform and simplify Makefile for single web frontend using markers
    const makefilePath = path.join(config.outputPath, "Makefile");
    let makefileContent = await readFile(makefilePath);
    if (makefileContent) {
        // Replace project name throughout
        let newMakefileContent = makefileContent.replace(/serverlesslaunchpad/g, config.projectBaseName);

        // Process scaffolding markers:
        // 1. Remove content between BEGIN:SCAFFOLDING_REMOVE and END:SCAFFOLDING_REMOVE (including markers)
        // 2. Uncomment content between BEGIN:SCAFFOLDING_INSERT and END:SCAFFOLDING_INSERT (and remove markers)

        // Remove SCAFFOLDING_REMOVE blocks (including the markers and their content)
        newMakefileContent = newMakefileContent.replace(
            /\t?# BEGIN:SCAFFOLDING_REMOVE\n[\s\S]*?# END:SCAFFOLDING_REMOVE\n/g,
            ""
        );

        // Process SCAFFOLDING_INSERT blocks: uncomment and remove markers
        newMakefileContent = newMakefileContent.replace(
            /\t?# BEGIN:SCAFFOLDING_INSERT\n([\s\S]*?)# END:SCAFFOLDING_INSERT\n/g,
            (_match, content) => {
                // Uncomment each line (remove leading "# " from lines that have it)
                return content
                    .split("\n")
                    .map((line: string) => {
                        // Remove the "# " prefix from commented lines, preserving the tab
                        if (line.match(/^\t# /)) {
                            return line.replace(/^\t# /, "\t");
                        }
                        return line;
                    })
                    .join("\n");
            }
        );

        if (newMakefileContent !== makefileContent) {
            await writeFile(makefilePath, newMakefileContent);
            filesModified++;
        }
    }

    // Transform moto init scripts
    const motoInitDir = path.join(config.outputPath, "moto", "init");
    const motoFiles = await glob(motoInitDir, ["*.sh"]);

    for (const file of motoFiles) {
        let content = await readFile(file);

        if (content) {
            // First, replace the full configDomain (serverlesslaunchpad.com -> user's configDomain)
            // This is important for secrets naming to match what the API expects
            let newContent = content.replace(/serverlesslaunchpad\.com/g, config.configDomain);
            // Then replace remaining project name references
            newContent = newContent.replace(/serverlesslaunchpad/g, config.projectBaseName);
            // Replace the DynamoDB table prefix (slp -> user's resourcePrefix)
            // This pattern is specific enough to avoid false positives
            newContent = newContent.replace(/TABLE_PREFIX="slp_/g, `TABLE_PREFIX="${config.resourcePrefix}_`);
            if (newContent !== content) {
                await writeFile(file, newContent);
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
