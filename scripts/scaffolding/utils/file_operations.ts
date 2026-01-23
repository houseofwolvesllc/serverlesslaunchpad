/**
 * File system utilities for scaffolding script
 */
import fs from "fs-extra";
import path from "path";

/**
 * Filter function for copying - excludes node_modules, dist, .git, etc.
 */
function defaultFilter(src: string): boolean {
    const basename = path.basename(src);
    const excludes = ["node_modules", "dist", ".git", ".DS_Store", "coverage", "*.log", ".turbo", ".next", ".svelte-kit"];
    return !excludes.some((pattern) => {
        if (pattern.startsWith("*")) {
            return basename.endsWith(pattern.slice(1));
        }
        return basename === pattern;
    });
}

/**
 * Copy a directory recursively with filtering
 */
export async function copyDirectory(source: string, target: string, filter = defaultFilter): Promise<number> {
    let fileCount = 0;

    await fs.copy(source, target, {
        filter: (src) => {
            const shouldCopy = filter(src);
            if (shouldCopy && fs.statSync(src).isFile()) {
                fileCount++;
            }
            return shouldCopy;
        },
        overwrite: true,
        errorOnExist: false,
    });

    return fileCount;
}

/**
 * Copy a single file with error handling
 */
export async function copyFile(source: string, target: string): Promise<void> {
    await fs.ensureDir(path.dirname(target));
    await fs.copy(source, target, { overwrite: true });
}

/**
 * Remove empty directories recursively
 */
export async function removeEmptyDirs(dir: string): Promise<void> {
    if (!(await fs.pathExists(dir))) return;

    const stat = await fs.stat(dir);
    if (!stat.isDirectory()) return;

    let files = await fs.readdir(dir);

    for (const file of files) {
        await removeEmptyDirs(path.join(dir, file));
    }

    files = await fs.readdir(dir);
    if (files.length === 0) {
        await fs.rmdir(dir);
    }
}

/**
 * Check if path exists
 */
export async function pathExists(filePath: string): Promise<boolean> {
    return fs.pathExists(filePath);
}

/**
 * Read file contents
 */
export async function readFile(filePath: string): Promise<string> {
    return fs.readFile(filePath, "utf-8");
}

/**
 * Write file contents
 */
export async function writeFile(filePath: string, content: string): Promise<void> {
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, content, "utf-8");
}

/**
 * Read JSON file
 */
export async function readJson<T>(filePath: string): Promise<T> {
    return fs.readJson(filePath);
}

/**
 * Write JSON file
 */
export async function writeJson(filePath: string, data: unknown): Promise<void> {
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeJson(filePath, data, { spaces: 4 });
}

/**
 * Get all files in a directory matching a pattern
 */
export async function glob(dir: string, patterns: string[]): Promise<string[]> {
    const results: string[] = [];

    async function walk(currentDir: string): Promise<void> {
        if (!(await fs.pathExists(currentDir))) return;

        const items = await fs.readdir(currentDir);

        for (const item of items) {
            const fullPath = path.join(currentDir, item);
            const stat = await fs.stat(fullPath);

            if (stat.isDirectory()) {
                if (!["node_modules", "dist", ".git"].includes(item)) {
                    await walk(fullPath);
                }
            } else {
                const matches = patterns.some((pattern) => {
                    if (pattern.startsWith("*.")) {
                        return item.endsWith(pattern.slice(1));
                    }
                    return item === pattern;
                });
                if (matches) {
                    results.push(fullPath);
                }
            }
        }
    }

    await walk(dir);
    return results;
}
