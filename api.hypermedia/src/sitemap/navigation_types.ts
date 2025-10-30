/**
 * Navigation type definitions for HAL-FORMS sitemap
 *
 * The navigation structure provides a hierarchical menu system that references
 * links and templates by key. This separates navigation structure (groups, hierarchy)
 * from the actual hypermedia controls (_links and _templates).
 */

/**
 * Navigation item referencing a link or template
 *
 * Navigation items reference entries in _links or _templates by their key.
 * The type field indicates which collection to look up.
 *
 * @example
 * ```typescript
 * // References _links.home
 * { rel: "home", type: "link" }
 *
 * // References _templates.logout with custom title
 * { rel: "logout", type: "template", title: "Sign Out" }
 * ```
 */
export interface NavItem {
    /** Key of the link or template in _links or _templates */
    rel: string;

    /** Type of reference - determines which collection to look up */
    type: "link" | "template";

    /** Optional title override (falls back to link/template title) */
    title?: string;
}

/**
 * Navigation group with title and items (can be recursive)
 *
 * Navigation groups organize navigation items into logical sections.
 * Groups can contain items or other groups (for nested menus).
 *
 * @example
 * ```typescript
 * {
 *   title: "Main Navigation",
 *   items: [
 *     { rel: "home", type: "link" },
 *     { rel: "sessions", type: "link" },
 *     {
 *       title: "Admin",  // Nested group
 *       items: [
 *         { rel: "users", type: "link" },
 *         { rel: "settings", type: "link" }
 *       ]
 *     }
 *   ]
 * }
 * ```
 */
export interface NavGroup {
    /** Group title (always required) */
    title: string;

    /** Items in this group (can be NavItems or nested NavGroups) */
    items: (NavItem | NavGroup)[];
}

/**
 * Root navigation structure
 *
 * The navigation is an array of top-level groups.
 * Each group represents a major section of the application.
 */
export type Navigation = NavGroup[];

/**
 * Type guard to check if an item is a NavItem (not a nested group)
 */
export function isNavItem(item: NavItem | NavGroup): item is NavItem {
    return 'rel' in item && 'type' in item;
}

/**
 * Type guard to check if an item is a NavGroup
 */
export function isNavGroup(item: NavItem | NavGroup): item is NavGroup {
    return 'items' in item && !('rel' in item);
}
