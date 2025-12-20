import { writable } from 'svelte/store';

// Define SitemapItem interface locally since it's not in types package yet
export interface SitemapItem {
	id: string;
	label: string;
	icon?: string;
	path?: string;
	children?: SitemapItem[];
	order?: number;
}

export interface NavigationState {
	sitemap: SitemapItem[];
	mobileOpened: boolean;
	desktopOpened: boolean;
}

const initialState: NavigationState = {
	sitemap: [],
	mobileOpened: false,
	desktopOpened: true,
};

/**
 * Navigation state store
 *
 * Manages sidebar state and dynamic sitemap navigation
 */
function createNavigationStore() {
	const { subscribe, set, update } = writable<NavigationState>(initialState);

	return {
		subscribe,
		setSitemap: (sitemap: SitemapItem[]) => {
			update(state => ({ ...state, sitemap }));
		},
		toggleMobile: () => {
			update(state => ({ ...state, mobileOpened: !state.mobileOpened }));
		},
		closeMobile: () => {
			update(state => ({ ...state, mobileOpened: false }));
		},
		openMobile: () => {
			update(state => ({ ...state, mobileOpened: true }));
		},
		toggleDesktop: () => {
			update(state => ({ ...state, desktopOpened: !state.desktopOpened }));
		},
		closeDesktop: () => {
			update(state => ({ ...state, desktopOpened: false }));
		},
		openDesktop: () => {
			update(state => ({ ...state, desktopOpened: true }));
		},
		reset: () => {
			set(initialState);
		},
	};
}

export const navigationStore = createNavigationStore();
