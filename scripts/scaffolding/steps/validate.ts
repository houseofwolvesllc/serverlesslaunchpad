/**
 * Validation step for scaffolding
 */
import fs from "fs-extra";
import path from "path";
import { ScaffoldingConfig, ValidationResult } from "../types";

/**
 * Required packages that must exist in source
 */
const REQUIRED_PACKAGES = [
    "api.hypermedia",
    "assets",
    "core",
    "framework",
    "infrastructure",
    "moto",
    "types",
    "web.commons",
    "web.commons.react",
    "web.mantine",
    "web.shadcn",
    "web.daisyui",
    "web.svelte",
];

/**
 * Validate the scaffolding configuration
 */
export async function validate(config: ScaffoldingConfig): Promise<ValidationResult> {
    const errors: string[] = [];

    // Validate output path doesn't exist or is empty
    if (await fs.pathExists(config.outputPath)) {
        const files = await fs.readdir(config.outputPath);
        if (files.length > 0) {
            errors.push(`Directory already exists and is not empty: ${config.outputPath}`);
        }
    }

    // Validate source monorepo structure
    for (const pkg of REQUIRED_PACKAGES) {
        const pkgPath = path.join(config.sourceRoot, pkg);
        if (!(await fs.pathExists(pkgPath))) {
            errors.push(`Required package not found: ${pkg}`);
        }
    }

    // Validate selected web framework exists
    const webPkgPath = path.join(config.sourceRoot, `web.${config.webFramework}`);
    if (!(await fs.pathExists(webPkgPath))) {
        errors.push(`Selected web framework not found: web.${config.webFramework}`);
    }

    // Validate project name format
    if (!config.projectName.startsWith("@")) {
        errors.push("Project name must be scoped (start with @)");
    }

    // Validate resource prefix
    if (!/^[a-z0-9]{2,8}$/.test(config.resourcePrefix)) {
        errors.push("Resource prefix must be 2-8 lowercase alphanumeric characters");
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}
