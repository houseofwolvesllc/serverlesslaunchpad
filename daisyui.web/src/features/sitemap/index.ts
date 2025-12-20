/**
 * Sitemap Feature Module
 *
 * Exports hooks and utilities for working with API sitemap navigation
 */

// Hooks
export { useSitemap, type UseSitemapResult } from './hooks/use_sitemap';

// Utils
export {
    transformNavigationItems,
    transformNavigationItem,
    createFallbackNavigation,
    expandTemplatedUri,
    shouldIncludeItem,
    type NavigationItem,
    type LinksGroupProps,
    type UserContext,
    type TemplateParams,
} from './utils/transform_navigation';

export {
    getIcon,
    hasIcon,
    getAvailableIconNames,
    iconMapper,
} from './utils/icon_mapper';
