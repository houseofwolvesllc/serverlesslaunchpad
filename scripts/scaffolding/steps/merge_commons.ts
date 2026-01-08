/**
 * Merge web.commons into web/src step
 */
import path from "path";
import { ScaffoldingConfig, StepResult, MergeOperation } from "../types";
import { copyDirectory, mergeDirectory, pathExists } from "../utils/file_operations";
import { log } from "../utils/logger";

/**
 * Merge operations for web.commons
 */
const MERGE_OPERATIONS: MergeOperation[] = [
    { source: "collection", target: "collection", mode: "copy" },
    { source: "configuration", target: "configuration", mode: "merge" },
    { source: "enums", target: "enums", mode: "copy" },
    { source: "lib", target: "lib", mode: "merge" },
    { source: "logging", target: "logging", mode: "merge" },
    { source: "services", target: "services", mode: "merge" },
    { source: "templates", target: "templates", mode: "copy" },
];

/**
 * Merge web.commons/src into web/src
 */
export async function mergeCommons(config: ScaffoldingConfig): Promise<StepResult> {
    log.section("🔗", "Merging web.commons...");

    const commonsRoot = path.join(config.sourceRoot, "web.commons", "src");
    const webSrcRoot = path.join(config.outputPath, "web", "src");

    let totalFiles = 0;

    for (const op of MERGE_OPERATIONS) {
        const source = path.join(commonsRoot, op.source);
        const target = path.join(webSrcRoot, op.target);

        if (!(await pathExists(source))) {
            log.warning(`Skipped ${op.source} (not found)`);
            continue;
        }

        let fileCount: number;
        if (op.mode === "copy") {
            fileCount = await copyDirectory(source, target);
        } else {
            fileCount = await mergeDirectory(source, target);
        }

        totalFiles += fileCount;
        log.success(`${op.source}${op.mode === "merge" ? " (merged)" : ""}`);
    }

    return {
        success: true,
        filesProcessed: totalFiles,
    };
}
