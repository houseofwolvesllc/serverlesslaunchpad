/**
 * Update package.json files step
 */
import path from "path";
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

    const newFullPackage = `${config.projectScope}/${config.projectBaseName}`;

    // Find all package.json files
    const packageFiles = await glob(config.outputPath, ["package.json"]);

    let filesUpdated = 0;

    for (const file of packageFiles) {
        const pkg = await readJson<Record<string, unknown>>(file);
        let modified = false;

        // Update package name
        if (typeof pkg.name === "string" && pkg.name.includes(oldFullPackage)) {
            pkg.name = pkg.name.replace(oldFullPackage, newFullPackage);
            modified = true;
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
                .filter((w: string) => !REMOVED_PACKAGES.includes(w))
                .map((w: string) => {
                    // Rename web.{framework} to web
                    if (w === `./web.${config.webFramework}`) {
                        return "./web";
                    }
                    return w;
                });

            if (newWorkspaces.length !== workspaces.length || !newWorkspaces.every((w: string, i: number) => w === workspaces[i])) {
                pkg.workspaces = newWorkspaces;
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
