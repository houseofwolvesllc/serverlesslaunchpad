#!/usr/bin/env node
/**
 * Serverless Launchpad Project Scaffolding Script
 *
 * Creates a new project from the Serverless Launchpad monorepo template.
 */
import path from "path";
import { fileURLToPath } from "url";

import { promptForConfig } from "./cli";
import { validate } from "./steps/validate";
import { copyPackages } from "./steps/copy_packages";
import { copyWeb } from "./steps/copy_web";
import { mergeCommons } from "./steps/merge_commons";
import { mergeCommonsReact } from "./steps/merge_commons_react";
import { updatePackageJson } from "./steps/update_package_json";
import { updateProjectConfig } from "./steps/update_project_config";
import { transformImports } from "./steps/transform_imports";
import { finalize } from "./steps/finalize";
import { log } from "./utils/logger";

// Get the source root (monorepo root)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sourceRoot = path.resolve(__dirname, "../..");

async function main(): Promise<void> {
    const startTime = Date.now();

    try {
        // Get configuration from user
        const config = await promptForConfig(sourceRoot);

        // Validate configuration
        const validation = await validate(config);
        if (!validation.valid) {
            log.error("Validation failed:");
            for (const error of validation.errors) {
                log.error(`  - ${error}`);
            }
            process.exit(1);
        }

        // Execute scaffolding steps
        await copyPackages(config);
        await copyWeb(config);
        await mergeCommons(config);
        await mergeCommonsReact(config);
        await updatePackageJson(config);
        await updateProjectConfig(config);
        await transformImports(config);

        // Finalize
        const result = await finalize(config);
        if (!result.success) {
            log.error(result.message || "Finalization failed");
            process.exit(1);
        }

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        log.info(`Completed in ${elapsed}s`);
    } catch (error) {
        log.error(`Error: ${(error as Error).message}`);
        if (process.env.DEBUG) {
            console.error(error);
        }
        process.exit(1);
    }
}

main();
