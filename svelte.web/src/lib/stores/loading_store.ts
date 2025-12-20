import { writable } from 'svelte/store';

/**
 * Global loading state store
 *
 * Controls the full-screen loading overlay for async operations
 */
function createLoadingStore() {
	const { subscribe, set } = writable(false);

	return {
		subscribe,
		setLoading: (loading: boolean) => set(loading),
		show: () => set(true),
		hide: () => set(false),
	};
}

export const loadingStore = createLoadingStore();
