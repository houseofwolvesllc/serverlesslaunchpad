import { useMemo } from 'react';
import type { HalLink, HalTemplate } from '@houseofwolves/serverlesslaunchpad.types/hal';
import type { BreadcrumbItem, NavigationHistoryItem, NavItem, NavGroup } from '../types';
import { getHref, getTitle } from '../utils/hal_helpers';

export interface UseBreadcrumbsDependencies {
  history: NavigationHistoryItem[];
  navStructure: (NavItem | NavGroup)[] | undefined;
  links: Record<string, HalLink> | undefined;
  templates: Record<string, HalTemplate> | undefined;
  currentPathname: string;
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
 *
 * @param deps - Dependencies injected by the consumer
 * @returns Array of breadcrumb items
 *
 * @example
 * ```typescript
 * // In a React project, wrap this with project-specific hooks:
 * function useBreadcrumbs() {
 *   const { history } = useNavigationHistory();
 *   const { navStructure, links, templates } = useSitemap();
 *   const location = useLocation();
 *
 *   return useBreadcrumbsCore({
 *     history,
 *     navStructure,
 *     links,
 *     templates,
 *     currentPathname: location.pathname
 *   });
 * }
 * ```
 */
export function useBreadcrumbs(deps: UseBreadcrumbsDependencies): BreadcrumbItem[] {
  const { history, navStructure, links, templates, currentPathname } = deps;

  return useMemo(() => {
    const crumbs: BreadcrumbItem[] = [];

    // Always start with Dashboard (non-clickable if it's the current page)
    const isDashboard = currentPathname === '/' || currentPathname === '/dashboard';
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
        return selfHref === currentPathname;
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

        // Use stored parent groups from history (only for menu navigation)
        // For link navigation, parentGroups will be undefined - and that's correct!
        // The breadcrumb trail comes from the history chain itself, not from sitemap groups.
        const parentGroups = historyItem.parentGroups;

        // Add parent groups only if they were stored (menu navigation)
        if (parentGroups && parentGroups.length > 0) {
          for (const group of parentGroups) {
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
        const isCurrentPage = selfHref === currentPathname;
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

      // Note: We used to add a fallback current page here when not in history,
      // but that caused a flash when the resource loaded. Now we simply wait
      // for the resource to be added to history by useHalResourceTracking.
      // During the brief loading period, breadcrumbs will end at the parent page.
    }

    return crumbs;
  }, [history, navStructure, links, templates, currentPathname]);
}
