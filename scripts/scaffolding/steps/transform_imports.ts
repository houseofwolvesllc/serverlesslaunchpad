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
    // Glob from package root to catch files in src/, lib/, config/, deployment/, etc.
    const otherPackages = ["api.hypermedia", "core", "framework", "infrastructure", "types"];

    for (const pkg of otherPackages) {
        const pkgDir = path.join(config.outputPath, pkg);
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
    const dockerComposePath = path.join(config.outputPath, "docker-compose.local.yml");
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
        // Replace project name and display name throughout
        let newMakefileContent = makefileContent.replace(/Serverless Launchpad/g, config.projectDisplayName);
        newMakefileContent = newMakefileContent.replace(/serverlesslaunchpad/g, config.projectBaseName);

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
            // Replace hardcoded Moto port references
            newContent = newContent.replace(/localhost:5555/g, `localhost:${config.basePort + 3}`);
            // Replace the DynamoDB table prefix (slp -> user's resourcePrefix)
            // This pattern is specific enough to avoid false positives
            newContent = newContent.replace(/TABLE_PREFIX="slp_/g, `TABLE_PREFIX="${config.resourcePrefix}_`);
            if (newContent !== content) {
                await writeFile(file, newContent);
                filesModified++;
            }
        }
    }

    // Branding sweep: replace display name, author, and org references across all files
    // Order matters - more specific patterns first to avoid partial matches
    const brandingPatterns: [RegExp, string][] = [
        [/House of Wolves LLC/g, config.author],
        [/House of Wolves/g, config.author],
        [/Serverless Launchpad/g, config.projectDisplayName],
        [/houseofwolvesllc/g, config.projectScope.slice(1)],
    ];

    // Sweep all files in copied packages for branding references
    const brandingDirs = ["api.hypermedia", "core", "framework", "infrastructure", "types", "web"];
    for (const dir of brandingDirs) {
        const dirPath = path.join(config.outputPath, dir);

        // Process all TypeScript/Svelte files from package root (catches src/, lib/, deployment/, etc.)
        const tsFiles = await glob(dirPath, ["*.ts", "*.tsx", "*.svelte"]);
        for (const file of tsFiles) {
            let content = await readFile(file);
            if (!content) continue;
            let newContent = content;
            for (const [pattern, replacement] of brandingPatterns) {
                newContent = newContent.replace(pattern, replacement);
            }
            newContent = newContent.replace(/serverlesslaunchpad/g, config.projectBaseName);
            if (newContent !== content) {
                await writeFile(file, newContent);
                filesModified++;
            }
        }

        // Process package.json description fields
        const pkgJsonPath = path.join(dirPath, "package.json");
        let pkgJsonContent = await readFile(pkgJsonPath);
        if (pkgJsonContent) {
            let newPkgJson = pkgJsonContent;
            for (const [pattern, replacement] of brandingPatterns) {
                newPkgJson = newPkgJson.replace(pattern, replacement);
            }
            if (newPkgJson !== pkgJsonContent) {
                await writeFile(pkgJsonPath, newPkgJson);
                filesModified++;
            }
        }

        // Process README.md, CLAUDE.md, index.html, and sub-directory docs
        for (const pattern of ["README.md", "CLAUDE.md", "index.html", "*.md"]) {
            const matchedFiles = await glob(dirPath, [pattern]);
            for (const file of matchedFiles) {
                let content = await readFile(file);
                if (!content) continue;
                let newContent = content;
                for (const [pat, replacement] of brandingPatterns) {
                    newContent = newContent.replace(pat, replacement);
                }
                newContent = newContent.replace(/serverlesslaunchpad/g, config.projectBaseName);
                if (newContent !== content) {
                    await writeFile(file, newContent);
                    filesModified++;
                }
            }
        }

        // Process HTML files (index.html may be nested)
        const htmlFiles = await glob(dirPath, ["*.html"]);
        for (const file of htmlFiles) {
            let content = await readFile(file);
            if (!content) continue;
            let newContent = content;
            for (const [pat, replacement] of brandingPatterns) {
                newContent = newContent.replace(pat, replacement);
            }
            newContent = newContent.replace(/serverlesslaunchpad/g, config.projectBaseName);
            if (newContent !== content) {
                await writeFile(file, newContent);
                filesModified++;
            }
        }
    }

    // Process root-level branding files: README.md, NOTICE, LICENSE
    const rootBrandingFiles = ["README.md", "NOTICE", "LICENSE"];
    for (const fileName of rootBrandingFiles) {
        const filePath = path.join(config.outputPath, fileName);
        let content = await readFile(filePath);
        if (!content) continue;
        let newContent = content;
        for (const [pattern, replacement] of brandingPatterns) {
            newContent = newContent.replace(pattern, replacement);
        }
        newContent = newContent.replace(/serverlesslaunchpad/g, config.projectBaseName);
        if (newContent !== content) {
            await writeFile(filePath, newContent);
            filesModified++;
        }
    }

    // Generate .env file with port configuration
    const basePort = config.basePort;
    const envContent = [
        "# Local Docker Development Ports",
        `BASE_PORT=${basePort}`,
        `POSTGRES_PORT=${basePort}`,
        `API_PORT=${basePort + 1}`,
        `WEB_PORT=${basePort + 2}`,
        `MOTO_PORT=${basePort + 3}`,
        `COGNITO_PORT=${basePort + 4}`,
        "",
    ].join("\n");

    const envPath = path.join(config.outputPath, ".env");
    await writeFile(envPath, envContent);
    filesModified++;

    // Update .env.development with configured ports
    const envDevPath = path.join(config.outputPath, ".env.development");
    let envDevContent = await readFile(envDevPath);
    if (envDevContent) {
        envDevContent = envDevContent
            .replace(/^BASE_PORT=.*$/m, `BASE_PORT=${basePort}`)
            .replace(/^POSTGRES_PORT=.*$/m, `POSTGRES_PORT=${basePort}`)
            .replace(/^API_PORT=.*$/m, `API_PORT=${basePort + 1}`)
            .replace(/^WEB_PORT=.*$/m, `WEB_PORT=${basePort + 2}`)
            .replace(/^MOTO_PORT=.*$/m, `MOTO_PORT=${basePort + 3}`)
            .replace(/^COGNITO_PORT=.*$/m, `COGNITO_PORT=${basePort + 4}`)
            .replace(/localhost:5555/g, `localhost:${basePort + 3}`)
            .replace(/localhost:3001/g, `localhost:${basePort + 1}`)
            .replace(/localhost:5173/g, `localhost:${basePort + 2}`);
        await writeFile(envDevPath, envDevContent);
        filesModified++;
    }

    log.success(`${filesModified} files updated`);

    return {
        success: true,
        filesProcessed: filesModified,
    };
}
