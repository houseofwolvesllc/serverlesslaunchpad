/**
 * Breadcrumbs Store
 *
 * Derived store that generates breadcrumbs from navigation history.
 * Breadcrumbs are built from the resources in history with their parent groups.
 */

import { derived } from 'svelte/store';
import { page } from '$app/stores';
import { navigationHistoryStore } from './navigation_history_store';
import { sitemapStore } from './sitemap_store';
import type { BreadcrumbItem } from '$lib/types/navigation';
import { getHref, getTitle } from '$lib/utils/hal_helpers';
import { logger } from '$lib/logging';

/**
 * Breadcrumbs store
 *
 * Automatically generates breadcrumbs based on:
 * 1. Always starts with Dashboard
 * 2. Parent groups from menu navigation (stored in history)
 * 3. Resources from navigation history
 * 4. Current page is marked as non-clickable
 */
export const breadcrumbsStore = derived(
	[navigationHistoryStore, sitemapStore, page],
	([$navHistory, $sitemap, $page]) => {
		const crumbs: BreadcrumbItem[] = [];

		// Always start with Dashboard
		const isDashboard = $page.url.pathname === '/' || $page.url.pathname === '/dashboard';
		const isOnlyDashboard =
			$navHistory.history.length === 0 || ($navHistory.history.length === 1 && isDashboard);

		crumbs.push({
			label: 'Dashboard',
			href: isOnlyDashboard ? null : '/dashboard',
			isLast: isOnlyDashboard,
			isGroup: false
		});

		logger.debug('[Breadcrumbs] Building breadcrumbs', {
			historyDepth: $navHistory.history.length,
			currentPath: $page.url.pathname,
			isDashboard,
			isOnlyDashboard
		});

		// Build breadcrumbs from history
		if (
			$navHistory.history.length > 0 &&
			$sitemap.navStructure &&
			$sitemap.links &&
			$sitemap.templates
		) {
			const addedGroups = new Set<string>();

			// Check if current path is in history
			const currentPathInHistory = $navHistory.history.some((item) => {
				const selfHref = getHref(item.resource._links?.self);
				return selfHref === $page.url.pathname;
			});

			for (let i = 0; i < $navHistory.history.length; i++) {
				const historyItem = $navHistory.history[i];
				const resource = historyItem.resource;
				const selfHref = getHref(resource._links?.self);

				if (!selfHref) {
					logger.warn('[Breadcrumbs] History item missing self href', { index: i });
					continue;
				}

				// Skip dashboard in history (already added above)
				if (selfHref === '/dashboard' || selfHref === '/') {
					continue;
				}

				// Add parent groups if stored (menu navigation only)
				const parentGroups = historyItem.parentGroups;
				if (parentGroups && parentGroups.length > 0) {
					for (const group of parentGroups) {
						if (!addedGroups.has(group.title)) {
							addedGroups.add(group.title);
							crumbs.push({
								label: group.title,
								href: null, // Groups are never clickable
								isLast: false,
								isGroup: true
							});

							logger.debug('[Breadcrumbs] Added parent group', { group: group.title });
						}
					}
				}

				// Determine if this is the current page
				const isCurrentPage = selfHref === $page.url.pathname;
				const isLast = currentPathInHistory ? isCurrentPage : false;

				// Get label from self link title
				const label = getTitle(resource._links?.self) || 'Resource';

				crumbs.push({
					label,
					href: isLast ? null : selfHref,
					isLast,
					isGroup: false
				});

				logger.debug('[Breadcrumbs] Added resource', {
					label,
					href: selfHref,
					isLast,
					isCurrentPage
				});
			}
		}

		logger.debug('[Breadcrumbs] Final breadcrumbs', {
			count: crumbs.length,
			items: crumbs.map((c) => ({ label: c.label, isLast: c.isLast, isGroup: c.isGroup }))
		});

		return crumbs;
	}
);
