/**
 * HAL Resource Tracking Utility
 *
 * Tracks HAL resources loaded via use_hal_resource and manages navigation history.
 * Detects menu vs link navigation and looks up parent groups for breadcrumb generation.
 */

import { get } from 'svelte/store';
import { page } from '$app/stores';
import type { HalObject } from '@houseofwolves/serverlesslaunchpad.types/hal';
import type { NavGroup } from '$lib/types/navigation';
import { navigationHistoryStore } from '$lib/stores/navigation_history_store';
import { sitemapStore } from '$lib/stores/sitemap_store';
import { getHref, ensureSelfLink, extractTitleFromResource } from './hal_helpers';
import { findParentGroups } from './navigation_helpers';
import { logger } from '$lib/logging';

/**
 * Track state across invocations
 */
let previousHref: string | null = null;
let isInitialMount = true;

/**
 * Track a HAL resource in navigation history
 *
 * This function is called by use_hal_resource whenever a resource is loaded.
 * It determines whether to push the resource to history or reset history
 * based on the navigation source and current state.
 *
 * @param resource - HAL resource to track
 */
export function trackHalResource(resource: HalObject | null | undefined) {
	// Check skip flag first
	if (navigationHistoryStore.consumeSkipFlag()) {
		logger.debug('[HAL Tracking] Skipping navigation (breadcrumb or back)');
		return;
	}

	if (!resource) {
		logger.debug('[HAL Tracking] No resource, skipping');
		return;
	}

	const navHistory = get(navigationHistoryStore);
	const sitemap = get(sitemapStore);
	const currentPage = get(page);

	// Get href from self reference (links or templates)
	let currentHref = getHref(resource._links?.self);

	if (!currentHref && resource._templates?.self) {
		currentHref = resource._templates.self.target;
		logger.debug('[HAL Tracking] Using template self target', { href: currentHref });
	}

	if (!currentHref) {
		currentHref = currentPage.url.pathname;
		logger.debug('[HAL Tracking] No self link/template, using pathname', { href: currentHref });
	}

	logger.debug('[HAL Tracking] Processing resource', {
		currentHref,
		previousHref,
		isInitialMount
	});

	// Skip if same as previous
	if (previousHref === currentHref) {
		logger.debug('[HAL Tracking] Same as previous, skipping');
		return;
	}

	// Ensure resource has self link
	let resourceToStore = resource;
	if (!resource._links?.self) {
		logger.debug('[HAL Tracking] Adding missing self link to resource');
		const title = extractTitleFromResource(resource, currentHref);
		resourceToStore = ensureSelfLink(resource, currentHref, title);
	}

	// Check for menu navigation
	const isMenuNavigation =
		(currentPage.state as any)?.navigationSource === 'menu' ||
		navigationHistoryStore.consumeMenuFlag();

	logger.debug('[HAL Tracking] Navigation source', {
		isMenuNavigation,
		pageState: currentPage.state,
		consumedMenuFlag: navigationHistoryStore.consumeMenuFlag()
	});

	// Lookup parent groups for menu navigation
	let parentGroups: NavGroup[] | undefined;
	if (isMenuNavigation && sitemap.navStructure && sitemap.links && sitemap.templates) {
		parentGroups = findParentGroups(
			currentHref,
			sitemap.navStructure,
			sitemap.links,
			sitemap.templates
		);

		if (parentGroups) {
			logger.debug('[HAL Tracking] Found parent groups', {
				groups: parentGroups.map((g) => g.title)
			});
		} else {
			logger.debug('[HAL Tracking] No parent groups found for menu navigation');
		}
	}

	// Determine action
	const isDashboard = currentHref === '/' || currentHref === '/dashboard';

	if (isMenuNavigation) {
		logger.debug('[HAL Tracking] ACTION: Reset history (menu navigation)');
		navigationHistoryStore.resetHistory(resourceToStore, 'menu', parentGroups);
	} else if (navHistory.history.length === 0 || (isDashboard && isInitialMount)) {
		logger.debug('[HAL Tracking] ACTION: Reset history (first load or dashboard)');
		navigationHistoryStore.resetHistory(resourceToStore, 'menu');
	} else if (isDashboard) {
		logger.debug('[HAL Tracking] ACTION: Reset history (navigating to dashboard)');
		navigationHistoryStore.resetHistory(resourceToStore, 'menu');
	} else {
		const lastInHistory = navHistory.history[navHistory.history.length - 1];
		const lastHref = getHref(lastInHistory?.resource._links?.self);

		if (lastHref !== currentHref) {
			logger.debug('[HAL Tracking] ACTION: Push to history (link navigation)');
			navigationHistoryStore.pushResource(resourceToStore, 'link');
		} else {
			logger.debug('[HAL Tracking] ACTION: No change (already last in history)');
		}
	}

	previousHref = currentHref;
	isInitialMount = false;
}

/**
 * Reset tracking state
 *
 * Used when navigating away from the app or during testing.
 */
export function resetTracking() {
	previousHref = null;
	isInitialMount = true;
	logger.debug('[HAL Tracking] Reset tracking state');
}
