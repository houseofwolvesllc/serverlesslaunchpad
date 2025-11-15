import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import type { HalObject, HalLink } from '@houseofwolves/serverlesslaunchpad.types/hal';
import { useNavigationHistory } from '@/context/navigation_history_context';

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

/**
 * Extract a title from HAL hypermedia controls (HATEOAS-compliant)
 * Only checks _links.self.title or _templates.self.title, then falls back to href
 */
function extractTitleFromResource(resource: HalObject, fallbackHref: string): string {
  // Try _links.self.title (for link-based resources)
  const linkTitle = getTitle(resource._links?.self);
  if (linkTitle) return linkTitle;

  // Try _templates.self.title (for template-based resources)
  // Note: Templates have title as a direct property, not nested in a link
  const selfTemplate = (resource as any)._templates?.self;
  if (selfTemplate?.title) return selfTemplate.title;

  // Fall back to deriving from href (only when API provides no title)
  const pathSegments = fallbackHref.split('/').filter(Boolean);
  let lastSegment = pathSegments[pathSegments.length - 1];

  // If last segment is "list", use the resource type from second-to-last segment
  if (lastSegment === 'list' && pathSegments.length > 1) {
    lastSegment = pathSegments[pathSegments.length - 2];
  }

  return lastSegment
    ? lastSegment.split('-').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ')
    : 'Resource';
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
 */
export function useHalResourceTracking(resource: HalObject | null | undefined) {
  const location = useLocation();
  const { history, pushResource, resetHistory, shouldSkipNextNavigation } = useNavigationHistory();
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

    // Try to get href from self link, otherwise use current pathname
    let currentHref = getHref(resource._links?.self);

    if (!currentHref) {
      // Collections and template responses might not have self link
      // Use the current pathname instead
      currentHref = location.pathname;
      console.log('[HAL Tracking] No self link, using pathname:', currentHref);
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
    const isMenuNavigation = (location.state as any)?.navigationSource === 'menu';
    console.log('[HAL Tracking] Is menu navigation:', isMenuNavigation, 'from location.state');

    // Determine navigation source
    const isDashboard = currentHref === '/' || currentHref === '/dashboard';

    if (isMenuNavigation) {
      // Explicitly marked as menu navigation - always reset
      console.log('[HAL Tracking] ACTION: Reset history (menu navigation)');
      resetHistory(resourceToStore, 'menu');
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
  }, [resource, history, pushResource, resetHistory, shouldSkipNextNavigation, location.pathname, location.state]);
}
