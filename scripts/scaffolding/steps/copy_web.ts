/**
 * Copy selected web framework step
 */
import path from "path";
import { ScaffoldingConfig, StepResult } from "../types";
import { copyDirectory } from "../utils/file_operations";
import { log } from "../utils/logger";

/**
 * Copy selected web framework to web/ directory
 */
export async function copyWeb(config: ScaffoldingConfig): Promise<StepResult> {
    log.section("🎨", `Copying web.${config.webFramework} → web...`);

    const source = path.join(config.sourceRoot, `web.${config.webFramework}`);
    const target = path.join(config.outputPath, "web");

    const fileCount = await copyDirectory(source, target);
    log.success("Web project copied and renamed");

    return {
        success: true,
        filesProcessed: fileCount,
    };
}
