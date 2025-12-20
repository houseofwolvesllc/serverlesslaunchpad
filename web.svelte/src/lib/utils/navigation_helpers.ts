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

		const resolved = {
			href: link.href,
			title: item.title || link.title || item.rel,
			type: 'link' as const
		};

		logger.debug('[resolveNavItem] Resolved link', {
			rel: item.rel,
			title: resolved.title,
			href: resolved.href
		});

		return resolved;
	} else {
		const template = templates[item.rel];
		if (!template) {
			logger.warn('[resolveNavItem] Template not found', { rel: item.rel });
			return null;
		}

		const resolved = {
			href: template.target,
			title: item.title || template.title || item.rel,
			type: 'template' as const,
			method: template.method,
			template
		};

		logger.debug('[resolveNavItem] Resolved template', {
			rel: item.rel,
			title: resolved.title,
			href: resolved.href,
			method: resolved.method
		});

		return resolved;
	}
}

/**
 * Transform navigation structure to sidebar-ready format
 *
 * Converts the hierarchical navigation structure from the API into
 * a flat array of LinksGroupProps suitable for rendering in the sidebar.
 *
 * Always preserves group hierarchy (never flattens single-item groups)
 * to maintain structure like "Admin" > "Users".
 *
 * @param navStructure - Navigation structure from API
 * @param resolveItem - Function to resolve nav items to hrefs
 * @returns Array of LinksGroupProps
 */
export function transformNavStructure(
	navStructure: (NavItem | NavGroup)[],
	resolveItem: (item: NavItem) => ResolvedNavItem | null
): LinksGroupProps[] {
	const result: LinksGroupProps[] = [];

	for (const item of navStructure) {
		// Handle root-level NavItems
		if ('rel' in item) {
			const navItem = item as NavItem;
			const resolved = resolveItem(navItem);

			if (!resolved) continue;

			// Include in navigation:
			// 1. All links (GET)
			// 2. GET templates
			// 3. POST templates ending in /list (collection list endpoints with search/filter)
			const isNavigable =
				resolved.type === 'link' ||
				(resolved.type === 'template' && resolved.method === 'GET') ||
				(resolved.type === 'template' && resolved.method === 'POST' && resolved.href.endsWith('/list'));

			if (isNavigable) {
				result.push({
					icon: navItem.icon,
					label: resolved.title,
					link: resolved.href
				});
			} else {
				logger.debug('[transformNavStructure] Skipping root-level non-GET template from navigation', {
					title: resolved.title,
					type: resolved.type,
					method: resolved.method
				});
			}
			continue;
		}

		// Handle NavGroups
		const group = item as NavGroup;

		// Always render groups as collapsible (don't flatten single-item groups)
		// This preserves the group hierarchy (e.g., "Admin" > "Users")
		{
			// Transform child items
			const childLinks: NavLink[] = [];

			for (const item of group.items) {
				if ('rel' in item) {
					// NavItem - resolve to link or template
					const navItem = item as NavItem;
					const resolved = resolveItem(navItem);

					if (!resolved) continue;

					// Include in navigation:
					// 1. All links (GET)
					// 2. GET templates
					// 3. POST templates ending in /list (collection list endpoints with search/filter)
					const isNavigable =
						resolved.type === 'link' ||
						(resolved.type === 'template' && resolved.method === 'GET') ||
						(resolved.type === 'template' && resolved.method === 'POST' && resolved.href.endsWith('/list'));

					if (isNavigable) {
						childLinks.push({
							label: resolved.title,
							link: resolved.href,
							icon: navItem.icon,
							rel: navItem.rel
						});
						logger.info('[transformNavStructure] Including in navigation', {
							title: resolved.title,
							type: resolved.type,
							method: resolved.method,
							href: resolved.href,
							rel: navItem.rel
						});
					} else {
						logger.info('[transformNavStructure] SKIPPING non-GET template', {
							title: resolved.title,
							type: resolved.type,
							method: resolved.method,
							href: resolved.href
						});
					}
				} else {
					// Nested NavGroup - recursively transform
					const nestedGroup = item as NavGroup;
					const nestedTransformed = transformNavStructure([nestedGroup], resolveItem);

					// Flatten nested group items into child links
					for (const nested of nestedTransformed) {
						if (nested.link) {
							childLinks.push({
								label: nested.label,
								link: nested.link,
								icon: nested.icon
							});
						} else if (nested.links) {
							childLinks.push(...nested.links);
						}
					}
				}
			}

			if (childLinks.length > 0) {
				logger.info('[transformNavStructure] Adding group to navigation', {
					groupTitle: group.title,
					childCount: childLinks.length,
					children: childLinks.map(c => c.label)
				});
				result.push({
					icon: group.icon,
					label: group.title,
					links: childLinks
				});
			} else {
				logger.info('[transformNavStructure] SKIPPING group with no children', {
					groupTitle: group.title,
					originalItemCount: group.items.length
				});
			}
		}
	}

	return result;
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
