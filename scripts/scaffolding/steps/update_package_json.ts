/**
 * Update package.json files step
 */
import { ScaffoldingConfig, StepResult } from "../types";
import { readJson, writeJson, glob } from "../utils/file_operations";
import { log } from "../utils/logger";

/**
 * Packages that should be removed from workspaces
 */
const REMOVED_PACKAGES = ["./web.commons", "./web.commons.react", "./web.mantine", "./web.shadcn", "./web.daisyui", "./web.svelte"];

/**
 * Dependencies to remove from web/package.json
 */
const REMOVED_DEPENDENCIES = [
    "@houseofwolves/serverlesslaunchpad.web.commons",
    "@houseofwolves/serverlesslaunchpad.web.commons.react",
];

/**
 * Update all package.json files with new project name
 */
export async function updatePackageJson(config: ScaffoldingConfig): Promise<StepResult> {
    log.section("📝", "Updating package.json files...");

    const oldScope = "@houseofwolves";
    const oldBaseName = "serverlesslaunchpad";
    const oldFullPackage = `${oldScope}/${oldBaseName}`;
    const oldRootName = "houseofwolves.serverlesslaunchpad";

    const newFullPackage = `${config.projectScope}/${config.projectBaseName}`;
    // Root package name uses scope without @ and with dot separator
    const newRootName = `${config.projectScope.replace("@", "")}.${config.projectBaseName}`;

    // Find all package.json files
    const packageFiles = await glob(config.outputPath, ["package.json"]);

    let filesUpdated = 0;

    for (const file of packageFiles) {
        const pkg = await readJson<Record<string, unknown>>(file);
        let modified = false;

        // Update package name
        if (typeof pkg.name === "string") {
            if (pkg.name === oldRootName) {
                // Root package.json uses dot format
                pkg.name = newRootName;
                pkg.author = config.author;
                modified = true;
            } else if (pkg.name.includes(oldFullPackage)) {
                pkg.name = pkg.name.replace(oldFullPackage, newFullPackage);
                modified = true;
            }
        }

        // Update dependencies
        for (const depType of ["dependencies", "devDependencies", "peerDependencies"]) {
            const deps = pkg[depType] as Record<string, string> | undefined;
            if (!deps) continue;

            const newDeps: Record<string, string> = {};
            for (const [name, version] of Object.entries(deps)) {
                // Remove web.commons dependencies from web package
                if (file.includes("/web/") && REMOVED_DEPENDENCIES.some((d) => name.includes(d.replace(oldFullPackage, "")))) {
                    modified = true;
                    continue;
                }

                // Update package references
                if (name.includes(oldFullPackage)) {
                    const newName = name.replace(oldFullPackage, newFullPackage);
                    newDeps[newName] = version;
                    modified = true;
                } else {
                    newDeps[name] = version;
                }
            }
            pkg[depType] = newDeps;
        }

        // Update workspaces (root package.json only)
        if (Array.isArray(pkg.workspaces)) {
            const workspaces = pkg.workspaces as string[];
            const newWorkspaces = workspaces
                .map((w: string) => {
                    // Rename web.{framework} to web (do this first before filtering)
                    if (w === `./web.${config.webFramework}`) {
                        return "./web";
                    }
                    return w;
                })
                .filter((w: string) => !REMOVED_PACKAGES.includes(w));

            if (newWorkspaces.length !== workspaces.length || !newWorkspaces.every((w: string, i: number) => w === workspaces[i])) {
                pkg.workspaces = newWorkspaces;
                modified = true;
            }

            // Update scripts for root package.json - simplify for single web frontend
            if (typeof pkg.scripts === "object" && pkg.scripts !== null) {
                const scripts = pkg.scripts as Record<string, string>;
                const newScripts: Record<string, string> = {};

                for (const [key, value] of Object.entries(scripts)) {
                    // Skip scripts for other web frameworks
                    if (key.match(/dev:web:(mantine|shadcn|daisyui|svelte)/) && key !== `dev:web:${config.webFramework}`) {
                        continue;
                    }
                    // Skip create-project script (not needed in scaffolded project)
                    if (key === "create-project") {
                        continue;
                    }

                    let newValue = value;

                    // Replace container names
                    newValue = newValue.replace(/serverlesslaunchpad/g, config.projectBaseName);

                    // Update web framework references to just "web" (replace any framework, not just selected)
                    newValue = newValue.replace(/web\.(mantine|shadcn|daisyui|svelte)/g, "web");
                    newValue = newValue.replace(/dev:web:(mantine|shadcn|daisyui|svelte)/g, "dev:web");

                    // Rename dev:web:{framework} key to dev:web
                    const newKey = key === `dev:web:${config.webFramework}` ? "dev:web" : key;

                    newScripts[newKey] = newValue;
                }

                // Create simplified dev:watch script for single web frontend
                newScripts["dev:watch"] = `concurrently --kill-others-on-fail --prefix-colors cyan,magenta,yellow,green,blue,red --names "WEB,API,TYPES,CORE,FRAMEWORK,COGNITO" "npm run dev:web" "npm run dev:api" "npm run dev:watch:types" "npm run dev:watch:core" "npm run dev:watch:framework" "docker logs -f --since=10s ${config.projectBaseName}-cognito-local 2>&1 | grep --line-buffered -v DEBUG"`;

                pkg.scripts = newScripts;
                modified = true;
            }
        }

        // Update description to include new project name
        if (typeof pkg.description === "string") {
            pkg.description = pkg.description.replace(/[Ss]erverless\s*[Ll]aunchpad/g, config.projectDisplayName);
            modified = true;
        }

        if (modified) {
            await writeJson(file, pkg);
            filesUpdated++;
        }
    }

    log.success(`${filesUpdated} files updated`);

    return {
        success: true,
        filesProcessed: filesUpdated,
    };
}
