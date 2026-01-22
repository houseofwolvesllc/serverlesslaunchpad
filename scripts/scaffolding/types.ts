/**
 * Scaffolding configuration types
 */

export type WebFramework = "mantine" | "shadcn" | "daisyui" | "svelte";

export interface ScaffoldingConfig {
    outputPath: string; // Absolute path to output directory
    projectName: string; // npm package name (e.g., "@mycompany/myapp")
    projectScope: string; // npm scope (e.g., "@mycompany")
    projectBaseName: string; // package name without scope (e.g., "myapp")
    projectNameDotted: string; // Dot notation (e.g., "mycompany.myapp")
    projectDisplayName: string; // Human-readable name (e.g., "My App")
    resourcePrefix: string; // Short prefix for AWS resources (e.g., "myapp")
    configDomain: string; // Domain for secrets/config (e.g., "myapp.mycompany.com")
    author: string; // Package author name
    webFramework: WebFramework;
    sourceRoot: string; // Path to serverlesslaunchpad monorepo
}

export interface ExportMapping {
    exportName: string; // Named export (e.g., "createApiClient")
    sourcePath: string; // Relative path in merged structure
    sourcePackage: "web.commons" | "web.commons.react";
}

export interface MergeOperation {
    source: string; // Source directory/file path
    target: string; // Target directory/file path
    mode: "copy" | "merge"; // Copy creates new, merge combines
}

export interface ValidationResult {
    valid: boolean;
    errors: string[];
}

export interface StepResult {
    success: boolean;
    message?: string;
    filesProcessed?: number;
}
