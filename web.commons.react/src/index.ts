// Navigation types
export type {
  NavItem,
  NavGroup,
  ResolvedNavItem,
  NavigationSource,
  NavigationHistoryItem,
  BreadcrumbItem
} from './navigation/types';

// Navigation context
export {
  NavigationHistoryProvider,
  useNavigationHistory
} from './navigation/context/navigation_history_context';

// Navigation hooks
export {
  useNavigation,
  type UseNavigationResult,
  type UseNavigationDependencies
} from './navigation/hooks/use_navigation';

export {
  useBreadcrumbs,
  type UseBreadcrumbsDependencies
} from './navigation/hooks/use_breadcrumbs';

export {
  useHalResourceTracking,
  type UseHalResourceTrackingDependencies
} from './navigation/hooks/use_hal_resource_tracking';

// Navigation utilities
export {
  getHref,
  getTitle,
  matchesPath,
  extractTitleFromResource,
  findParentGroups
} from './navigation/utils/hal_helpers';

// Navigation adapters
export type { SitemapAdapter } from './navigation/adapters/sitemap_adapter';
