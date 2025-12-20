/**
 * Navigation Type Definitions
 *
 * Type definitions for navigation system including sitemap structure,
 * navigation history, and breadcrumb generation.
 */

import type { HalObject, HalLink, HalTemplate } from '@houseofwolves/serverlesslaunchpad.types/hal';

/**
 * Navigation source type
 */
export type NavigationSource = 'menu' | 'link' | 'browser';

/**
 * Navigation item in sitemap (link or template reference)
 */
export interface NavItem {
	/** Type of navigation item */
	type: 'link' | 'template';
	/** Relation name (key in _links or _templates) */
	rel: string;
	/** Display title (optional, falls back to link/template title) */
	title?: string;
	/** Icon identifier (optional) */
	icon?: string;
}

/**
 * Navigation group in sitemap (collapsible menu section)
 */
export interface NavGroup {
	/** Group title */
	title: string;
	/** Icon identifier (optional) */
	icon?: string;
	/** Child navigation items */
	items: (NavItem | NavGroup)[];
}

/**
 * Resolved navigation item (after looking up link/template)
 */
export interface ResolvedNavItem {
	/** Resolved href */
	href: string;
	/** Resolved title */
	title: string;
	/** Type of item */
	type: 'link' | 'template';
	/** HTTP method (for templates) */
	method?: string;
	/** Full template (for rendering forms) */
	template?: HalTemplate;
}

/**
 * Navigation history item
 */
export interface NavigationHistoryItem {
	/** The HAL resource */
	resource: HalObject;
	/** How the user navigated to this resource */
	source: NavigationSource;
	/** Timestamp when navigated */
	timestamp: number;
	/** Parent groups from sitemap (only when navigating via menu) */
	parentGroups?: NavGroup[];
}

/**
 * Breadcrumb item
 */
export interface BreadcrumbItem {
	/** Display label */
	label: string;
	/** Link href (null if not clickable) */
	href: string | null;
	/** Is this the last item (current page) */
	isLast: boolean;
	/** Is this a group item (non-clickable parent group) */
	isGroup: boolean;
}

/**
 * Navigation link for sidebar rendering
 */
export interface NavLink {
	/** Display label */
	label: string;
	/** Link href */
	link: string;
	/** Icon identifier (optional) */
	icon?: string;
	/** Relation name from sitemap (used for component registry lookup) */
	rel?: string;
}

/**
 * Links group for sidebar rendering
 */
export interface LinksGroupProps {
	/** Group label */
	label: string;
	/** Icon identifier (optional) */
	icon?: string;
	/** Direct link (if group itself is a link) */
	link?: string;
	/** Child links */
	links?: NavLink[];
}

/**
 * User context for template expansion
 */
export interface UserContext {
	/** User ID */
	userId?: string;
	/** User role */
	role?: string;
}
