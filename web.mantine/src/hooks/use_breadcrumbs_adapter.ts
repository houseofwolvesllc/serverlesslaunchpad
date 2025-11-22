import { useBreadcrumbs as useBaseBreadcrumbs } from '@houseofwolves/serverlesslaunchpad.web.commons.react';
import { useLocation } from 'react-router-dom';
import { useNavigationHistory } from '../context/navigation_history_adapter';
import { useSitemap } from '../features/sitemap/hooks/use_sitemap';

export function useBreadcrumbs() {
  const { history } = useNavigationHistory();
  const { navStructure, links, templates } = useSitemap();
  const location = useLocation();

  return useBaseBreadcrumbs({
    history,
    navStructure,
    links,
    templates,
    currentPathname: location.pathname,
  });
}
