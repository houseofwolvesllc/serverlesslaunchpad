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

  // Log every time the hook is called, even with null
  console.log('[HAL Tracking] Hook called with resource:', resource ? 'EXISTS' : 'NULL/UNDEFINED');
  if (resource) {
    console.log('[HAL Tracking] Resource has _links?', !!resource._links);
    console.log('[HAL Tracking] Resource has _links.self?', !!resource._links?.self);
  }

  useEffect(() => {
    // Check if we should skip this navigation (e.g., breadcrumb click)
    if (shouldSkipNextNavigation()) {
      console.log('[HAL Tracking] Skipping navigation (breadcrumb or back navigation)');
      return;
    }

    if (!resource) {
      console.log('[HAL Tracking] No resource, skipping');
      return;
    }

    // Try to get href from self reference (links take precedence over templates)
    let currentHref = getHref(resource._links?.self);

    if (!currentHref && resource._templates?.self) {
      // Template-based resources use _templates.self.target
      currentHref = resource._templates.self.target;
      console.log('[HAL Tracking] Using template self target:', currentHref);
    }

    if (!currentHref) {
      // No self link or template - use current pathname as fallback
      currentHref = currentPathname;
      console.log('[HAL Tracking] No self link or template, using pathname:', currentHref);
    }

    console.log('[HAL Tracking] Processing resource:', currentHref);
    console.log('[HAL Tracking] Previous href:', previousHref.current);
    console.log('[HAL Tracking] Current history length:', history.length);

    // Skip if this is the same resource as before
    if (previousHref.current === currentHref) {
      console.log('[HAL Tracking] Same as previous, skipping');
      return;
    }

    // Ensure resource has a self link (collections might not have one)
    // If missing, add it using the current href
    let resourceToStore = resource;
    if (!resource._links?.self) {
      console.log('[HAL Tracking] Adding missing self link to resource');
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
    console.log('[HAL Tracking] Is menu navigation:', isMenuNavigation, 'from location.state');

    // Lookup parent groups for menu navigation
    const parentGroups = isMenuNavigation
      ? findParentGroups(currentHref, navStructure, links, templates)
      : undefined;

    if (parentGroups) {
      console.log('[HAL Tracking] Found parent groups:', parentGroups.map(g => g.title));
    }

    // Determine navigation source
    const isDashboard = currentHref === '/' || currentHref === '/dashboard';

    if (isMenuNavigation) {
      // Explicitly marked as menu navigation - always reset
      console.log('[HAL Tracking] ACTION: Reset history (menu navigation)');
      resetHistory(resourceToStore, 'menu', parentGroups);
    } else if (history.length === 0 || (isDashboard && isInitialMount.current)) {
      // First navigation or initial dashboard load - reset history
      console.log('[HAL Tracking] ACTION: Reset history (first load or dashboard)');
      resetHistory(resourceToStore, 'menu');
    } else if (isDashboard) {
      // Navigating to dashboard from elsewhere - reset
      console.log('[HAL Tracking] ACTION: Reset history (navigating to dashboard)');
      resetHistory(resourceToStore, 'menu');
    } else {
      // Check if this is the current last item in history
      const lastInHistory = history[history.length - 1];
      const lastHref = getHref(lastInHistory?.resource._links?.self);
      console.log('[HAL Tracking] Last in history:', lastHref);

      if (lastHref !== currentHref) {
        // Different from last item - append to history (link navigation)
        console.log('[HAL Tracking] ACTION: Push to history (link navigation)');
        pushResource(resourceToStore, 'link');
      } else {
        console.log('[HAL Tracking] ACTION: No change (already last in history)');
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
