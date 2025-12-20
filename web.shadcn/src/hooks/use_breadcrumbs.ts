import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useNavigationHistory } from '@/context/navigation_history_context';
import { useSitemap } from '@/features/sitemap/hooks/use_sitemap';
import type { NavItem, NavGroup } from './use_navigation';
import type { HalLink } from '@houseofwolves/serverlesslaunchpad.types/hal';

/**
 * Helper to get href from a HalLink (handles both single link and array)
 */
function getHref(link: HalLink | HalLink[] | undefined): string | undefined {
  if (!link) return undefined;
  if (Array.isArray(link)) return link[0]?.href;
  return link.href;
}

/**
 * Helper to get title from a HalLink (handles both single link and array)
 */
function getTitle(link: HalLink | HalLink[] | undefined): string | undefined {
  if (!link) return undefined;
  if (Array.isArray(link)) return link[0]?.title;
  return link.title;
}

export interface BreadcrumbItem {
  label: string;
  href: string | null;
  isLast: boolean;
  isGroup: boolean;
}

/**
 * Build breadcrumb trail from navigation history
 *
 * This hook creates breadcrumbs based on the navigation history, enriched with
 * NavGroup labels from the sitemap. This is HATEOAS-compliant: all labels and
 * hrefs come from HAL _links, with only group labels enriched from sitemap.
 *
 * NOTE: The current page should always appear in breadcrumbs, even if it hasn't
 * been added to history yet (timing issue during initial render).
 */
export function useBreadcrumbs(): BreadcrumbItem[] {
  const { history } = useNavigationHistory();
  const { navStructure, links, templates } = useSitemap();
  const location = useLocation();

  return useMemo(() => {
    const crumbs: BreadcrumbItem[] = [];

    // Always start with Dashboard (non-clickable if it's the current page)
    const isDashboard = location.pathname === '/' || location.pathname === '/dashboard';
    const isOnlyDashboard = history.length === 0 || (history.length === 1 && isDashboard);

    crumbs.push({
      label: 'Dashboard',
      href: isOnlyDashboard ? null : '/dashboard',
      isLast: isOnlyDashboard,
      isGroup: false,
    });

    // If we have navigation history, build breadcrumbs from it
    if (history.length > 0 && navStructure && links && templates) {
      // Track which groups we've already added to avoid duplicates
      const addedGroups = new Set<string>();

      // Check if current location is in history
      const currentPathInHistory = history.some(item => {
        const selfHref = getHref(item.resource._links?.self);
        return selfHref === location.pathname;
      });

      for (let i = 0; i < history.length; i++) {
        const historyItem = history[i];
        const resource = historyItem.resource;
        const selfHref = getHref(resource._links?.self);

        if (!selfHref) {
          continue; // Skip resources without self links
        }

        // Skip dashboard in history (we already added it)
        if (selfHref === '/dashboard' || selfHref === '/') {
          continue;
        }

        // Find matching NavItem in sitemap to determine if it's under a group
        const matchResult = findNavItemMatch(selfHref, navStructure, links, templates);

        // If matched and has parent groups, add them first
        if (matchResult && matchResult.parentGroups.length > 0) {
          for (const group of matchResult.parentGroups) {
            if (!addedGroups.has(group.title)) {
              addedGroups.add(group.title);
              crumbs.push({
                label: group.title,
                href: null, // Groups are never clickable
                isLast: false,
                isGroup: true,
              });
            }
          }
        }

        // Determine if this is the last item
        // If current path is in history, use that to determine isLast
        // Otherwise, mark the last history item as not last (current page will be added below)
        const isCurrentPage = selfHref === location.pathname;
        const isLast = currentPathInHistory ? isCurrentPage : false;

        // Get label from self link (tracking hook already ensured this exists with proper title)
        const label = getTitle(resource._links?.self) || 'Resource';

        // Add the resource itself
        crumbs.push({
          label,
          href: isLast ? null : selfHref, // Current page is not clickable
          isLast,
          isGroup: false,
        });
      }

      // If current page is not in history yet (timing issue), add it now
      if (!currentPathInHistory && !isDashboard) {
        // Try to find the current page in sitemap to get group info
        const matchResult = findNavItemMatch(location.pathname, navStructure, links, templates);

        // Add any parent groups that haven't been added yet
        if (matchResult && matchResult.parentGroups.length > 0) {
          for (const group of matchResult.parentGroups) {
            if (!addedGroups.has(group.title)) {
              addedGroups.add(group.title);
              crumbs.push({
                label: group.title,
                href: null,
                isLast: false,
                isGroup: true,
              });
            }
          }
        }

        // Add current page with URL-based fallback (will be replaced once tracking adds proper resource)
        const pathSegments = location.pathname.split('/').filter(Boolean);
        let lastSegment = pathSegments[pathSegments.length - 1];

        // If last segment is "list", use the resource type instead
        if (lastSegment === 'list' && pathSegments.length > 1) {
          lastSegment = pathSegments[pathSegments.length - 2];
        }

        const fallbackLabel = lastSegment
          ? lastSegment.split('-').map(word =>
              word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ')
          : 'Current Page';

        crumbs.push({
          label: fallbackLabel,
          href: null,
          isLast: true,
          isGroup: false,
        });
      }
    }

    return crumbs;
  }, [history, navStructure, links, templates, location.pathname]);
}

/**
 * Match result containing NavItem and its parent groups
 */
interface NavItemMatchResult {
  item: NavItem;
  parentGroups: NavGroup[];
}

/**
 * Find a NavItem in the navigation structure that matches the given href
 * Returns the item and its parent groups (for breadcrumb enrichment)
 */
function findNavItemMatch(
  href: string,
  navStructure: (NavItem | NavGroup)[],
  links: Record<string, any>,
  templates: Record<string, any>,
  parentGroups: NavGroup[] = []
): NavItemMatchResult | null {
  for (const item of navStructure) {
    if ('rel' in item) {
      // NavItem
      const navItem = item as NavItem;
      const itemHref = resolveHref(navItem, links, templates);

      if (itemHref && matchesPath(itemHref, href)) {
        return {
          item: navItem,
          parentGroups,
        };
      }
    } else {
      // NavGroup - recurse with this group added to parent chain
      const group = item as NavGroup;
      const result = findNavItemMatch(
        href,
        group.items,
        links,
        templates,
        [...parentGroups, group]
      );

      if (result) {
        return result;
      }
    }
  }

  return null;
}

/**
 * Resolve NavItem to its href
 */
function resolveHref(
  item: NavItem,
  links: Record<string, any>,
  templates: Record<string, any>
): string | null {
  if (item.type === 'link') {
    return links[item.rel]?.href || null;
  } else {
    return templates[item.rel]?.target || null;
  }
}

/**
 * Check if href matches pathname (supporting template parameters)
 */
function matchesPath(templateHref: string, actualHref: string): boolean {
  // Convert template variables {userId} to regex patterns
  // e.g., "/users/{userId}/sessions/list" -> "/users/[^/]+/sessions/list"
  const pattern = templateHref.replace(/\{[^}]+\}/g, '[^/]+');
  const regex = new RegExp(`^${pattern}$`);
  return regex.test(actualHref);
}
