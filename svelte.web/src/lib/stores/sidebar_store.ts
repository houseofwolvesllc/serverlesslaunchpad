import { writable } from 'svelte/store';
import { browser } from '$app/environment';

interface SidebarState {
	collapsed: boolean;
	mobileOpen: boolean;
}

function createSidebarStore() {
	// Load initial state from localStorage in browser
	const initialCollapsed = browser
		? localStorage.getItem('sidebar-collapsed') === 'true'
		: false;

	const { subscribe, set, update } = writable<SidebarState>({
		collapsed: initialCollapsed,
		mobileOpen: false
	});

	return {
		subscribe,
		toggle: () => {
			update(state => {
				const newCollapsed = !state.collapsed;
				if (browser) {
					localStorage.setItem('sidebar-collapsed', String(newCollapsed));
				}
				return { ...state, collapsed: newCollapsed };
			});
		},
		setCollapsed: (collapsed: boolean) => {
			if (browser) {
				localStorage.setItem('sidebar-collapsed', String(collapsed));
			}
			update(state => ({ ...state, collapsed }));
		},
		toggleMobile: () => {
			update(state => ({ ...state, mobileOpen: !state.mobileOpen }));
		},
		setMobileOpen: (open: boolean) => {
			update(state => ({ ...state, mobileOpen: open }));
		}
	};
}

export const sidebarStore = createSidebarStore();
