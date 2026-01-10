import { z } from "zod";

/**
 * Schema for project.config.json - the single source of truth for project identity.
 */
export const ProjectConfigSchema = z.object({
    packageScope: z.string().regex(/^@[a-z0-9-]+$/, "Must be a valid npm scope (e.g., @mycompany)"),
    packageName: z.string().regex(/^[a-z0-9-]+$/, "Must be a valid npm package name"),
    displayName: z.string().min(1, "Display name is required"),
    resourcePrefix: z.string().regex(/^[a-z0-9]{2,8}$/, "Must be 2-8 lowercase alphanumeric characters"),
    tablePrefix: z.string().regex(/^[a-z0-9]{2,8}$/, "Must be 2-8 lowercase alphanumeric characters"),
    configDomain: z.string().min(1, "Config domain is required"),
});

export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;

/**
 * Get the full npm package name (e.g., "@houseofwolves/serverlesslaunchpad")
 */
export function getFullPackageName(config: ProjectConfig): string {
    return `${config.packageScope}/${config.packageName}`;
}

/**
 * Get the dotted name for package naming (e.g., "houseofwolves.serverlesslaunchpad")
 */
export function getDottedName(config: ProjectConfig): string {
    return `${config.packageScope.slice(1)}.${config.packageName}`;
}

/**
 * Get the configuration filename (e.g., "serverlesslaunchpad.com.config.json")
 */
export function getConfigFilename(config: ProjectConfig): string {
    return `${config.configDomain}.config.json`;
}

/**
 * Get the KMS key alias for production (e.g., "alias/slp-production")
 */
export function getKmsKeyAlias(config: ProjectConfig): string {
    return `alias/${config.resourcePrefix}-production`;
}
