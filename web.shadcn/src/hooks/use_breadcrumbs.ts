import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useNavigationHistory } from '@/context/navigation_history_context';
import { useSitemap } from '@/features/sitemap/hooks/use_sitemap';
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

      // Note: We used to add a fallback current page here when not in history,
      // but that caused a flash when the resource loaded. Now we simply wait
      // for the resource to be added to history by useHalResourceTracking.
      // During the brief loading period, breadcrumbs will end at the parent page.
    }

    return crumbs;
  }, [history, navStructure, links, templates, location.pathname]);
}

