import { useHalResource } from './use_hal_resource';
import type { HalLink, HalTemplate } from '@houseofwolves/serverlesslaunchpad.types/hal';
import type { NavItem, NavGroup, ResolvedNavItem } from '@houseofwolves/serverlesslaunchpad.web.commons.react';

// Re-export types from web.commons.react
export type {
    NavItem,
    NavGroup,
    ResolvedNavItem
} from '@houseofwolves/serverlesslaunchpad.web.commons.react';

/**
 * Custom hook for managing navigation from HAL sitemap
 *
 * Fetches the sitemap and provides utilities to resolve navigation items
 * to their actual links or templates. This enables building menus from
 * the HATEOAS-defined navigation structure.
 *
 * @returns Navigation data and resolver functions
 *
 * @example
 * ```typescript
 * const { navigation, resolveItem, loading } = useNavigation();
 *
 * // Resolve a nav item to its actual data
 * const item = resolveItem({ rel: "logout", type: "template" });
 * if (item) {
 *   console.log(item.title); // "Logout"
 *   console.log(item.method); // "POST"
 * }
 * ```
 */
export function useNavigation() {
    const { data, loading, error, refetch } = useHalResource('/sitemap');

    const navigation: NavGroup[] = data?._nav || [];
    const links = (data?._links || {}) as Record<string, HalLink>;
    const templates = (data?._templates || {}) as Record<string, HalTemplate>;

    /**
     * Resolve a navigation item to its actual link or template
     *
     * @param item - Navigation item to resolve
     * @returns Resolved item with actual data, or null if not found
     */
    const resolveItem = (item: NavItem): ResolvedNavItem | null => {
        if (item.type === 'link') {
            const link = links[item.rel];
            if (!link) return null;

            return {
                href: link.href,
                title: item.title || link.title || item.rel,
                type: 'link'
            };
        } else {
            const template = templates[item.rel];
            if (!template) return null;

            return {
                href: template.target,
                title: item.title || template.title || item.rel,
                type: 'template',
                method: template.method,
                template
            };
        }
    };

    /**
     * Check if a navigation item exists (link or template is available)
     *
     * @param item - Navigation item to check
     * @returns true if the item can be resolved
     */
    const itemExists = (item: NavItem): boolean => {
        return resolveItem(item) !== null;
    };

    /**
     * Type guard to check if an item is a NavItem (not a nested group)
     */
    const isNavItem = (item: NavItem | NavGroup): item is NavItem => {
        return 'rel' in item && 'type' in item;
    };

    /**
     * Type guard to check if an item is a NavGroup
     */
    const isNavGroup = (item: NavItem | NavGroup): item is NavGroup => {
        return 'items' in item && !('rel' in item);
    };

    return {
        navigation,
        links,
        templates,
        resolveItem,
        itemExists,
        isNavItem,
        isNavGroup,
        loading,
        error,
        refetch
    };
}
