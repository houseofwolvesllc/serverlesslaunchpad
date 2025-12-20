export interface NavigationItem {
    /** Unique identifier for this navigation item */
    id: string;

    /** Display title for UI rendering */
    title: string;

    /** Optional URL - present for navigable items */
    href?: string;

    /** HTTP method if this is an action (POST, DELETE, etc.) */
    method?: string;

    /** Whether href is a URI template (contains {variables}) */
    templated?: boolean;

    /** Human-readable description */
    description?: string;

    /** Icon name for UI rendering */
    icon?: string;

    /** Role requirement to view this item */
    requiresRole?: string;

    /** Child navigation items (recursive) */
    items?: NavigationItem[];
}
