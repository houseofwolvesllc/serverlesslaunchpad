import { useNavigation as useBaseNavigation } from '@houseofwolves/serverlesslaunchpad.web.commons.react';
import { useHalResource } from './use_hal_resource';

export function useNavigation() {
  const { data, loading, error, refetch } = useHalResource('/sitemap');

  return useBaseNavigation({ data, loading, error, refetch });
}

export * from '@houseofwolves/serverlesslaunchpad.web.commons.react';
