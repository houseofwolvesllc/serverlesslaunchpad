import { useEffect, useRef } from 'react';
import type { HalObject, HalLink, HalTemplate } from '@houseofwolves/serverlesslaunchpad.types/hal';
import type { NavItem, NavGroup } from '../types';
import { getHref, extractTitleFromResource, findParentGroups } from '../utils/hal_helpers';

export interface UseHalResourceTrackingDependencies {
  currentPathname: string;
  locationState: any;
  history: any[];
  pushResource: (resource: HalObject, source: 'menu' | 'link' | 'browser', parentGroups?: NavGroup[]) => void;
  resetHistory: (resource: HalObject, source: 'menu' | 'link' | 'browser', parentGroups?: NavGroup[]) => void;
  shouldSkipNextNavigation: () => boolean;
  navStructure: (NavItem | NavGroup)[] | undefined;
  links: Record<string, HalLink> | undefined;
  templates: Record<string, HalTemplate> | undefined;
}

/**
 * Automatically track HAL resource in navigation history
 *
 * This hook should be called whenever a HAL resource is loaded.
 * It intelligently determines whether to:
 * - Reset history (new menu navigation)
 * - Push to history (following a link)
 * - Do nothing (same resource)
 *
 * @param resource - The HAL resource that was loaded
 * @param deps - Dependencies injected by the consumer
 *
 * @example
 * ```typescript
 * // In a React project, wrap this with project-specific hooks:
 * function useHalResourceTracking(resource: HalObject | null | undefined) {
 *   const location = useLocation();
 *   const { history, pushResource, resetHistory, shouldSkipNextNavigation } = useNavigationHistory();
 *   const { navStructure, links, templates } = useSitemap();
 *
 *   useHalResourceTrackingCore(resource, {
 *     currentPathname: location.pathname,
 *     locationState: location.state,
 *     history,
 *     pushResource,
 *     resetHistory,
 *     shouldSkipNextNavigation,
 *     navStructure,
 *     links,
 *     templates
 *   });
 * }
 * ```
 */
export function useHalResourceTracking(
  resource: HalObject | null | undefined,
  deps: UseHalResourceTrackingDependencies
) {
  const {
    currentPathname,
    locationState,
    history,
    pushResource,
    resetHistory,
    shouldSkipNextNavigation,
    navStructure,
    links,
    templates
  } = deps;

  const previousHref = useRef<string | null>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    // Check if we should skip this navigation (e.g., breadcrumb click)
    if (shouldSkipNextNavigation()) {
      return;
    }

    if (!resource) {
      return;
    }

    // Try to get href from self reference (links take precedence over templates)
    let currentHref = getHref(resource._links?.self);

    if (!currentHref && resource._templates?.self) {
      // Template-based resources use _templates.self.target
      currentHref = resource._templates.self.target;
    }

    if (!currentHref) {
      // No self link or template - use current pathname as fallback
      currentHref = currentPathname;
    }

    // Skip if this is the same resource as before
    if (previousHref.current === currentHref) {
      return;
    }

    // Ensure resource has a self link (collections might not have one)
    // If missing, add it using the current href
    let resourceToStore = resource;
    if (!resource._links?.self) {
      resourceToStore = {
        ...resource,
        _links: {
          ...resource._links,
          self: {
            href: currentHref,
            title: extractTitleFromResource(resource, currentHref),
          },
        },
      };
    }

    // Check if this navigation came from menu (via location state)
    const isMenuNavigation = (locationState as any)?.navigationSource === 'menu';

    // Lookup parent groups for menu navigation
    const parentGroups = isMenuNavigation
      ? findParentGroups(currentHref, navStructure, links, templates)
      : undefined;

    // Determine navigation source
    const isDashboard = currentHref === '/' || currentHref === '/dashboard';

    if (isMenuNavigation) {
      // Explicitly marked as menu navigation - always reset
      resetHistory(resourceToStore, 'menu', parentGroups);
    } else if (history.length === 0 || (isDashboard && isInitialMount.current)) {
      // First navigation or initial dashboard load - reset history
      resetHistory(resourceToStore, 'menu');
    } else if (isDashboard) {
      // Navigating to dashboard from elsewhere - reset
      resetHistory(resourceToStore, 'menu');
    } else {
      // Check if this is the current last item in history
      const lastInHistory = history[history.length - 1];
      const lastHref = getHref(lastInHistory?.resource._links?.self);

      if (lastHref !== currentHref) {
        // Different from last item - append to history (link navigation)
        pushResource(resourceToStore, 'link');
      }
    }

    previousHref.current = currentHref;
    isInitialMount.current = false;
  }, [
    resource,
    history,
    pushResource,
    resetHistory,
    shouldSkipNextNavigation,
    currentPathname,
    locationState,
    navStructure,
    links,
    templates
  ]);
}
