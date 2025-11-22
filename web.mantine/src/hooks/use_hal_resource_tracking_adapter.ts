import { useHalResourceTracking as useBaseTracking } from '@houseofwolves/serverlesslaunchpad.web.commons.react';
import { useLocation } from 'react-router-dom';
import { useNavigationHistory } from '../context/navigation_history_adapter';
import { useSitemap } from '../features/sitemap/hooks/use_sitemap';
import type { HalObject } from '@houseofwolves/serverlesslaunchpad.types/hal';

export function useHalResourceTracking(resource: HalObject | null | undefined) {
  const location = useLocation();
  const { history, pushResource, resetHistory, shouldSkipNextNavigation } = useNavigationHistory();
  const { navStructure, links, templates } = useSitemap();

  return useBaseTracking(resource, {
    currentPathname: location.pathname,
    locationState: location.state,
    history,
    pushResource,
    resetHistory,
    shouldSkipNextNavigation,
    navStructure,
    links,
    templates,
  });
}
