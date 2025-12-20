import type { HalObject, HalTemplate } from '@houseofwolves/serverlesslaunchpad.types/hal';

/**
 * Navigation item referencing a link or template
 */
export interface NavItem {
  rel: string;
  type: 'link' | 'template';
  title?: string;
}

/**
 * Navigation group with title and items (can be recursive)
 */
export interface NavGroup {
  title: string;
  items: (NavItem | NavGroup)[];
}

/**
 * Resolved navigation item with actual link or template data
 */
export interface ResolvedNavItem {
  href: string;
  title: string;
  type: 'link' | 'template';
  method?: string;
  template?: HalTemplate;
}

/**
 * Navigation source - how the user navigated to a resource
 */
export type NavigationSource = 'menu' | 'link' | 'browser';

/**
 * Item in navigation history
 */
export interface NavigationHistoryItem {
  resource: HalObject;
  source: NavigationSource;
  timestamp: number;
  /** Parent groups from sitemap (only when navigating via menu) */
  parentGroups?: NavGroup[];
}

/**
 * Breadcrumb item for display
 */
export interface BreadcrumbItem {
  label: string;
  href: string | null;
  isLast: boolean;
  isGroup: boolean;
}
