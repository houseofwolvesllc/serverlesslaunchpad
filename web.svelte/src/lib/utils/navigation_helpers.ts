/**
 * Navigation Helper Utilities
 *
 * Helper functions for working with navigation structure, parent group lookup,
 * and navigation transformation.
 */

import type { HalLink, HalTemplate } from '@houseofwolves/serverlesslaunchpad.types/hal';
import type {
	NavItem,
	NavGroup,
	ResolvedNavItem,
	LinksGroupProps,
	NavLink,
	UserContext
} from '$lib/types/navigation';
import { getHref, matchesPath } from './hal_helpers';
import { logger } from '$lib/logging';

/**
 * Find parent groups for a given href in the navigation structure
 *
 * Recursively searches the navigation structure to find which groups contain
 * an item with the given href. Returns the chain of parent groups.
 *
 * @param href - The href to search for
 * @param navStructure - The navigation structure to search
 * @param links - HAL links for resolving nav items
 * @param templates - HAL templates for resolving nav items
 * @param parentGroups - Accumulated parent groups (used in recursion)
 * @returns Array of parent groups, or undefined if not found
 */
export function findParentGroups(
	href: string,
	navStructure: (NavItem | NavGroup)[] | null,
	links: Record<string, HalLink> | null,
	templates: Record<string, HalTemplate> | null,
	parentGroups: NavGroup[] = []
): NavGroup[] | undefined {
	if (!navStructure || !links) {
		return undefined;
	}

	for (const item of navStructure) {
		// Check if this is a group
		if ('items' in item) {
			// It's a NavGroup
			const group = item as NavGroup;

			// Search within this group
			const found = findParentGroups(href, group.items, links, templates, [
				...parentGroups,
				group
			]);

			if (found) {
				return found;
			}
		} else {
			// It's a NavItem
			const navItem = item as NavItem;

			// Resolve the item to get its href
			const resolved = resolveNavItem(navItem, links, templates || {});

			if (!resolved) {
				continue;
			}

			// Check if this item matches the href
			if (resolved.href === href) {
				logger.debug('[findParentGroups] Found exact match', {
					href,
					parentGroups: parentGroups.map((g) => g.title)
				});
				return parentGroups;
			}

			// For templates, check if the href matches the template pattern
			if (resolved.type === 'template' && matchesPath(resolved.href, href)) {
				logger.debug('[findParentGroups] Found template match', {
					href,
					templateHref: resolved.href,
					parentGroups: parentGroups.map((g) => g.title)
				});
				return parentGroups;
			}
		}
	}

	return undefined;
}

/**
 * Resolve a navigation item to its actual link or template
 *
 * @param item - Navigation item to resolve
 * @param links - HAL links
 * @param templates - HAL templates
 * @returns Resolved navigation item or null if not found
 */
export function resolveNavItem(
	item: NavItem,
	links: Record<string, HalLink>,
	templates: Record<string, HalTemplate>
): ResolvedNavItem | null {
	if (item.type === 'link') {
		const link = links[item.rel];
		if (!link) {
			logger.warn('[resolveNavItem] Link not found', { rel: item.rel });
			return null;
		}

		return {
			href: link.href,
			title: item.title || link.title || item.rel,
			type: 'link'
		};
	} else {
		const template = templates[item.rel];
		if (!template) {
			logger.warn('[resolveNavItem] Template not found', { rel: item.rel });
			return null;
		}

		return {
			href: template.target,
			title: item.title || template.title || item.rel,
			type: 'template',
			method: template.method,
			template
		};
	}
}

/**
 * Transform navigation structure to sidebar-ready format
 *
 * Converts the hierarchical navigation structure from the API into
 * a flat array of LinksGroupProps suitable for rendering in the sidebar.
 *
 * @param navStructure - Navigation structure from API
 * @param resolveItem - Function to resolve nav items to hrefs
 * @returns Array of LinksGroupProps
 */
export function transformNavStructure(
	navStructure: (NavItem | NavGroup)[],
	resolveItem: (item: NavItem) => ResolvedNavItem | null
): LinksGroupProps[] {
	const groups: LinksGroupProps[] = [];

	for (const item of navStructure) {
		if ('items' in item) {
			// It's a NavGroup
			const group = item as NavGroup;
			const links: NavLink[] = [];

			// Process child items
			for (const child of group.items) {
				if ('items' in child) {
					// Nested group - flatten it
					const nestedGroup = child as NavGroup;
					for (const nestedItem of nestedGroup.items) {
						if (!('items' in nestedItem)) {
							const resolved = resolveItem(nestedItem as NavItem);
							if (resolved) {
								links.push({
									label: resolved.title,
									link: resolved.href,
									icon: (nestedItem as NavItem).icon
								});
							}
						}
					}
				} else {
					// Regular nav item
					const resolved = resolveItem(child as NavItem);
					if (resolved) {
						links.push({
							label: resolved.title,
							link: resolved.href,
							icon: (child as NavItem).icon
						});
					}
				}
			}

			groups.push({
				label: group.title,
				icon: group.icon,
				links: links.length > 0 ? links : undefined
			});
		} else {
			// It's a top-level NavItem
			const resolved = resolveItem(item as NavItem);
			if (resolved) {
				groups.push({
					label: resolved.title,
					icon: (item as NavItem).icon,
					link: resolved.href
				});
			}
		}
	}

	return groups;
}

/**
 * Create fallback navigation structure when sitemap is unavailable
 *
 * @param userContext - User context (optional)
 * @returns Fallback navigation structure
 */
export function createFallbackNavigation(userContext?: UserContext): LinksGroupProps[] {
	return [
		{
			label: 'Dashboard',
			icon: 'home',
			link: '/dashboard'
		},
		{
			label: 'My Account',
			icon: 'user',
			links: [
				{
					label: 'API Keys',
					link: '/api-keys',
					icon: 'key'
				},
				{
					label: 'Sessions',
					link: '/sessions',
					icon: 'clock'
				}
			]
		}
	];
}
