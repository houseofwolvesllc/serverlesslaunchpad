import { useNavigation as useNavigationCore, UseNavigationDependencies } from '@houseofwolves/serverlesslaunchpad.web.commons.react';
import { useHalResource } from './use_hal_resource';

/**
 * Project-specific wrapper for useNavigation
 * Provides navigation data from HAL sitemap
 */
export function useNavigation() {
  const halResourceResult = useHalResource('/sitemap');

  const deps: UseNavigationDependencies = {
    data: halResourceResult.data,
    loading: halResourceResult.loading,
    error: halResourceResult.error,
    refetch: halResourceResult.refetch
  };

  return useNavigationCore(deps);
}
