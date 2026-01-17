/**
 * Import path transformation logic for scaffolding
 */
import path from "path";
import { ExportMapping } from "../types";

/**
 * Import mapping reference for web.commons exports
 */
const WEB_COMMONS_MAPPINGS: ExportMapping[] = [
    // Services
    { exportName: "ApiClient", sourcePath: "services/api_client", sourcePackage: "web.commons" },
    { exportName: "createApiClient", sourcePath: "services/api_client", sourcePackage: "web.commons" },
    { exportName: "ApiClientError", sourcePath: "services/api_client", sourcePackage: "web.commons" },
    { exportName: "EntryPoint", sourcePath: "services/entry_point", sourcePackage: "web.commons" },
    { exportName: "createEntryPoint", sourcePath: "services/entry_point", sourcePackage: "web.commons" },
    { exportName: "LinkNavigator", sourcePath: "services/link_navigator", sourcePackage: "web.commons" },
    { exportName: "createLinkNavigator", sourcePath: "services/link_navigator", sourcePackage: "web.commons" },

    // Configuration
    { exportName: "WebConfigSchema", sourcePath: "configuration/web_config_schema", sourcePackage: "web.commons" },
    { exportName: "WebConfig", sourcePath: "configuration/web_config_schema", sourcePackage: "web.commons" },
    { exportName: "createWebConfigStore", sourcePath: "configuration/web_config_store", sourcePackage: "web.commons" },

    // Logging
    { exportName: "createWebLogger", sourcePath: "logging/logger", sourcePackage: "web.commons" },
    { exportName: "Logger", sourcePath: "logging/logger", sourcePackage: "web.commons" },
    { exportName: "LogLevel", sourcePath: "logging/logger", sourcePackage: "web.commons" },

    // Lib
    { exportName: "HalFormsClient", sourcePath: "lib/hal_forms_client", sourcePackage: "web.commons" },
    { exportName: "createHalFormsClient", sourcePath: "lib/hal_forms_client", sourcePackage: "web.commons" },

    // Field Rendering
    { exportName: "getEnumPropertyFromTemplates", sourcePath: "field-rendering/field_rendering_utils", sourcePackage: "web.commons" },
    { exportName: "determineBadgeVariant", sourcePath: "field-rendering/field_rendering_utils", sourcePackage: "web.commons" },
    { exportName: "formatDateValue", sourcePath: "field-rendering/field_rendering_utils", sourcePackage: "web.commons" },
    { exportName: "evaluateBooleanValue", sourcePath: "field-rendering/field_rendering_utils", sourcePackage: "web.commons" },
    { exportName: "shortenUrl", sourcePath: "field-rendering/field_rendering_utils", sourcePackage: "web.commons" },
    { exportName: "getNullValuePlaceholder", sourcePath: "field-rendering/field_rendering_utils", sourcePackage: "web.commons" },
    { exportName: "isArrayValue", sourcePath: "field-rendering/field_rendering_utils", sourcePackage: "web.commons" },
    { exportName: "isNullish", sourcePath: "field-rendering/field_rendering_utils", sourcePackage: "web.commons" },
    { exportName: "isEmpty", sourcePath: "field-rendering/field_rendering_utils", sourcePackage: "web.commons" },
    { exportName: "isValidDate", sourcePath: "field-rendering/field_rendering_utils", sourcePackage: "web.commons" },
];

/**
 * Import mapping reference for web.commons.react exports
 */
const WEB_COMMONS_REACT_MAPPINGS: ExportMapping[] = [
    // Navigation
    { exportName: "NavItem", sourcePath: "navigation/types", sourcePackage: "web.commons.react" },
    { exportName: "NavGroup", sourcePath: "navigation/types", sourcePackage: "web.commons.react" },
    { exportName: "ResolvedNavItem", sourcePath: "navigation/types", sourcePackage: "web.commons.react" },
    { exportName: "useNavigation", sourcePath: "navigation/hooks/use_navigation", sourcePackage: "web.commons.react" },
    { exportName: "useBreadcrumbs", sourcePath: "navigation/hooks/use_breadcrumbs", sourcePackage: "web.commons.react" },
    {
        exportName: "useNavigationHistory",
        sourcePath: "navigation/context/navigation_history_context",
        sourcePackage: "web.commons.react",
    },
    {
        exportName: "NavigationHistoryProvider",
        sourcePath: "navigation/context/navigation_history_context",
        sourcePackage: "web.commons.react",
    },
    { exportName: "SitemapAdapter", sourcePath: "navigation/adapters/sitemap_adapter", sourcePackage: "web.commons.react" },
    { exportName: "getHref", sourcePath: "navigation/utils/hal_helpers", sourcePackage: "web.commons.react" },
    { exportName: "getTitle", sourcePath: "navigation/utils/hal_helpers", sourcePackage: "web.commons.react" },
    { exportName: "matchesPath", sourcePath: "navigation/utils/hal_helpers", sourcePackage: "web.commons.react" },

    // HAL Resource
    { exportName: "useHalResourceDetail", sourcePath: "hal-resource/use_hal_resource_detail", sourcePackage: "web.commons.react" },
    { exportName: "inferPageTitle", sourcePath: "hal-resource/resource_utils", sourcePackage: "web.commons.react" },
    { exportName: "organizeFields", sourcePath: "hal-resource/resource_utils", sourcePackage: "web.commons.react" },
];

/**
 * All import mappings combined
 */
export const IMPORT_MAPPINGS: ExportMapping[] = [...WEB_COMMONS_MAPPINGS, ...WEB_COMMONS_REACT_MAPPINGS];

/**
 * Get relative path from one file to another
 */
function getRelativePath(fromFile: string, toFile: string): string {
    const fromDir = path.dirname(fromFile);
    let relativePath = path.relative(fromDir, toFile);

    // Ensure relative path starts with ./ or ../
    if (!relativePath.startsWith(".")) {
        relativePath = "./" + relativePath;
    }

    // Remove .ts extension for imports
    relativePath = relativePath.replace(/\.ts$/, "");

    return relativePath;
}

/**
 * Parse import statement and extract components
 */
interface ParsedImport {
    fullMatch: string;
    namedImports: string[];
    defaultImport?: string;
    modulePath: string;
    isTypeImport: boolean;
}

function parseImport(importStatement: string): ParsedImport | null {
    // Match import statements: import { a, b } from "module" or import type { a } from "module"
    const regex = /import\s+(type\s+)?(?:({[^}]+})|(\w+))\s+from\s+["']([^"']+)["']/;
    const match = importStatement.match(regex);

    if (!match) return null;

    const isTypeImport = !!match[1];
    const namedImportsStr = match[2];
    const defaultImport = match[3];
    const modulePath = match[4];

    let namedImports: string[] = [];
    if (namedImportsStr) {
        namedImports = namedImportsStr
            .slice(1, -1) // Remove { }
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
            .map((s) => s.split(" as ")[0].trim()); // Handle "Name as Alias"
    }

    return {
        fullMatch: match[0],
        namedImports,
        defaultImport,
        modulePath,
        isTypeImport,
    };
}

/**
 * Rewrite imports from web.commons packages to relative paths pointing to commons/ folder
 */
export function rewriteImports(
    fileContent: string,
    filePath: string,
    webSrcDir: string,
    projectScope: string,
    projectBaseName: string
): { content: string; modified: boolean } {
    // Match both old and new package names for web.commons
    const oldWebCommonsPackage = `@houseofwolves/serverlesslaunchpad.web.commons`;
    const newWebCommonsPackage = `${projectScope}/${projectBaseName}.web.commons`;

    let modified = false;
    let result = fileContent;

    // Calculate relative paths from the current file to the commons folders
    const commonsDir = path.join(webSrcDir, "commons");
    const commonsReactDir = path.join(webSrcDir, "commons-react");
    const relativeToCommons = getRelativePath(filePath, commonsDir);
    const relativeToCommonsReact = getRelativePath(filePath, commonsReactDir);

    // Replace web.commons imports with relative path to commons/
    // Handle: @houseofwolves/serverlesslaunchpad.web.commons (bare import)
    // Handle: @houseofwolves/testslp.web.commons (new project name)
    const patterns = [
        { pattern: new RegExp(`(['"])${escapeRegExp(oldWebCommonsPackage)}(['"])`, "g"), targetPath: relativeToCommons },
        { pattern: new RegExp(`(['"])${escapeRegExp(newWebCommonsPackage)}(['"])`, "g"), targetPath: relativeToCommons },
        { pattern: new RegExp(`(['"])${escapeRegExp(oldWebCommonsPackage)}\\.react(['"])`, "g"), targetPath: relativeToCommonsReact },
        { pattern: new RegExp(`(['"])${escapeRegExp(newWebCommonsPackage)}\\.react(['"])`, "g"), targetPath: relativeToCommonsReact },
    ];

    for (const { pattern, targetPath } of patterns) {
        if (pattern.test(result)) {
            result = result.replace(pattern, `$1${targetPath}$2`);
            modified = true;
        }
    }

    return { content: result, modified };
}

/**
 * Update package references in imports from old package names to new ones
 */
export function updatePackageImports(
    fileContent: string,
    oldScope: string,
    oldBaseName: string,
    newScope: string,
    newBaseName: string
): { content: string; modified: boolean } {
    const oldPackagePattern = `${oldScope}/${oldBaseName}`;
    const newPackagePattern = `${newScope}/${newBaseName}`;

    if (!fileContent.includes(oldPackagePattern)) {
        return { content: fileContent, modified: false };
    }

    const result = fileContent.replace(new RegExp(escapeRegExp(oldPackagePattern), "g"), newPackagePattern);

    return {
        content: result,
        modified: result !== fileContent,
    };
}

function escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
