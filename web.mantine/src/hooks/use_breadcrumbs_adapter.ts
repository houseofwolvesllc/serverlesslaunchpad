import { useLocation } from 'react-router-dom';
import { useBreadcrumbs as useBreadcrumbsCore, UseBreadcrumbsDependencies } from '@houseofwolves/serverlesslaunchpad.web.commons.react';
import { useNavigationHistory } from '@houseofwolves/serverlesslaunchpad.web.commons.react';
import { useSitemap } from '../features/sitemap/hooks/use_sitemap';

/**
 * Project-specific wrapper for useBreadcrumbs
 * Builds breadcrumb trail from navigation history
 */
export function useBreadcrumbs() {
  const { history } = useNavigationHistory();
  const { navStructure, links, templates } = useSitemap();
  const location = useLocation();

  const deps: UseBreadcrumbsDependencies = {
    history,
    navStructure,
    links,
    templates,
    currentPathname: location.pathname
  };

  return useBreadcrumbsCore(deps);
}
