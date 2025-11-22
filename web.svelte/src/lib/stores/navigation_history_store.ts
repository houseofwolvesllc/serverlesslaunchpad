/**
 * Navigation History Store
 *
 * Manages navigation history including resources visited, navigation source,
 * and parent groups for breadcrumb generation.
 */

import { writable } from 'svelte/store';
import type { HalObject } from '@houseofwolves/serverlesslaunchpad.types/hal';
import type { NavigationHistoryItem, NavigationSource, NavGroup } from '$lib/types/navigation';
import { getHref } from '$lib/utils/hal_helpers';
import { logger } from '$lib/logging';

/**
 * Maximum depth of navigation history to prevent memory issues
 */
const MAX_HISTORY_DEPTH = 50;

/**
 * Navigation history state
 */
export interface NavigationHistoryState {
	/** Array of navigation history items */
	history: NavigationHistoryItem[];
	/** Loading state */
	isLoading: boolean;
	/** Flag: next navigation should be treated as menu navigation */
	nextNavigationIsMenu: boolean;
	/** Flag: skip the next navigation tracking */
	skipNextNavigation: boolean;
}

/**
 * Create navigation history store
 */
function createNavigationHistoryStore() {
	const initialState: NavigationHistoryState = {
		history: [],
		isLoading: false,
		nextNavigationIsMenu: false,
		skipNextNavigation: false
	};

	const { subscribe, update } = writable<NavigationHistoryState>(initialState);

	return {
		subscribe,

		/**
		 * Push a resource to navigation history
		 *
		 * Adds a new resource to the end of the history stack. Automatically
		 * prevents duplicates and enforces max history depth.
		 *
		 * @param resource - HAL resource to add
		 * @param source - Navigation source (menu/link/browser)
		 * @param parentGroups - Parent groups (only for menu navigation)
		 */
		pushResource(resource: HalObject, source: NavigationSource, parentGroups?: NavGroup[]) {
			update((state) => {
				// Check if the resource is the same as the current one (avoid duplicates)
				const currentSelfHref = getHref(
					state.history[state.history.length - 1]?.resource._links?.self
				);
				const newSelfHref = getHref(resource._links?.self);

				if (currentSelfHref === newSelfHref) {
					logger.debug('[Nav History] Skipping duplicate resource', { href: newSelfHref });
					return state; // Same resource, don't add to history
				}

				const newItem: NavigationHistoryItem = {
					resource,
					source,
					timestamp: Date.now(),
					parentGroups
				};

				const newHistory = [...state.history, newItem];

				// Enforce max depth
				if (newHistory.length > MAX_HISTORY_DEPTH) {
					logger.debug('[Nav History] Enforcing max depth', {
						maxDepth: MAX_HISTORY_DEPTH,
						currentDepth: newHistory.length
					});
					return {
						...state,
						history: newHistory.slice(newHistory.length - MAX_HISTORY_DEPTH)
					};
				}

				logger.debug('[Nav History] Pushed resource', {
					href: newSelfHref,
					source,
					hasParentGroups: !!parentGroups,
					historyDepth: newHistory.length
				});

				return { ...state, history: newHistory };
			});
		},

		/**
		 * Reset history with a new initial resource
		 *
		 * Clears existing history and starts fresh with the provided resource.
		 * Used for menu navigation where we want to reset the breadcrumb trail.
		 *
		 * @param initialResource - New initial resource
		 * @param source - Navigation source (defaults to 'menu')
		 * @param parentGroups - Parent groups
		 */
		resetHistory(
			initialResource: HalObject,
			source: NavigationSource = 'menu',
			parentGroups?: NavGroup[]
		) {
			const newItem: NavigationHistoryItem = {
				resource: initialResource,
				source,
				timestamp: Date.now(),
				parentGroups
			};

			logger.debug('[Nav History] Reset history', {
				href: getHref(initialResource._links?.self),
				source,
				hasParentGroups: !!parentGroups
			});

			update((state) => ({
				...state,
				history: [newItem]
			}));
		},

		/**
		 * Pop the last item from history
		 *
		 * Removes and returns the last navigation history item.
		 * Does not pop if only one item remains.
		 *
		 * @returns The popped item, or null if history has only one item
		 */
		popHistory(): NavigationHistoryItem | null {
			let poppedItem: NavigationHistoryItem | null = null;

			update((state) => {
				if (state.history.length <= 1) {
					logger.debug('[Nav History] Cannot pop - only one item in history');
					return state; // Don't pop if only one item left
				}

				poppedItem = state.history[state.history.length - 1];
				const newHistory = state.history.slice(0, -1);

				logger.debug('[Nav History] Popped item', {
					href: getHref(poppedItem.resource._links?.self),
					remainingDepth: newHistory.length
				});

				return { ...state, history: newHistory };
			});

			return poppedItem;
		},

		/**
		 * Clear all navigation history
		 */
		clearHistory() {
			logger.debug('[Nav History] Cleared all history');
			update((state) => ({ ...state, history: [] }));
		},

		/**
		 * Truncate history to a specific index
		 *
		 * Keeps only items up to and including the specified index.
		 * Used when clicking on a breadcrumb to go back in history.
		 *
		 * @param index - Index to truncate to
		 */
		truncateHistory(index: number) {
			update((state) => {
				const newHistory = state.history.slice(0, index + 1);

				logger.debug('[Nav History] Truncated history', {
					fromDepth: state.history.length,
					toDepth: newHistory.length,
					index
				});

				return { ...state, history: newHistory };
			});
		},

		/**
		 * Set loading state
		 *
		 * @param loading - Loading state
		 */
		setIsLoading(loading: boolean) {
			update((state) => ({ ...state, isLoading: loading }));
		},

		/**
		 * Mark next navigation as menu navigation
		 *
		 * Sets a flag that will be consumed by the tracking utility to
		 * identify menu navigation and reset history appropriately.
		 */
		markNextNavigationAsMenu() {
			logger.debug('[Nav History] Marked next navigation as MENU');
			update((state) => ({ ...state, nextNavigationIsMenu: true }));
		},

		/**
		 * Consume menu navigation flag
		 *
		 * Reads and resets the menu navigation flag.
		 *
		 * @returns True if next navigation was marked as menu
		 */
		consumeMenuFlag(): boolean {
			let wasMenu = false;
			update((state) => {
				wasMenu = state.nextNavigationIsMenu;
				return { ...state, nextNavigationIsMenu: false };
			});

			logger.debug('[Nav History] Consumed menu flag', { wasMenu });
			return wasMenu;
		},

		/**
		 * Mark next navigation to be skipped
		 *
		 * Sets a flag that will be consumed by the tracking utility to
		 * skip tracking the next navigation (e.g., breadcrumb clicks).
		 */
		markNextNavigationSkip() {
			logger.debug('[Nav History] Marked next navigation to SKIP');
			update((state) => ({ ...state, skipNextNavigation: true }));
		},

		/**
		 * Consume skip navigation flag
		 *
		 * Reads and resets the skip navigation flag.
		 *
		 * @returns True if next navigation should be skipped
		 */
		consumeSkipFlag(): boolean {
			let shouldSkip = false;
			update((state) => {
				shouldSkip = state.skipNextNavigation;
				return { ...state, skipNextNavigation: false };
			});

			logger.debug('[Nav History] Consumed skip flag', { shouldSkip });
			return shouldSkip;
		}
	};
}

export const navigationHistoryStore = createNavigationHistoryStore();
