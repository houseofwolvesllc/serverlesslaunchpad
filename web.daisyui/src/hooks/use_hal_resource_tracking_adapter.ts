import { useLocation } from 'react-router-dom';
import { useHalResourceTracking as useHalResourceTrackingCore, UseHalResourceTrackingDependencies } from '@houseofwolves/serverlesslaunchpad.web.commons.react';
import { useNavigationHistory } from '@houseofwolves/serverlesslaunchpad.web.commons.react';
import { useSitemap } from '@/features/sitemap/hooks/use_sitemap';
import type { HalObject } from '@houseofwolves/serverlesslaunchpad.types/hal';

/**
 * Project-specific wrapper for useHalResourceTracking
 * Automatically tracks HAL resource in navigation history
 */
export function useHalResourceTracking(resource: HalObject | null | undefined) {
  const location = useLocation();
  const { history, pushResource, resetHistory, shouldSkipNextNavigation } = useNavigationHistory();
  const { navStructure, links, templates } = useSitemap();

  const deps: UseHalResourceTrackingDependencies = {
    currentPathname: location.pathname,
    locationState: location.state,
    history,
    pushResource,
    resetHistory,
    shouldSkipNextNavigation,
    navStructure,
    links,
    templates
  };

  useHalResourceTrackingCore(resource, deps);
}
