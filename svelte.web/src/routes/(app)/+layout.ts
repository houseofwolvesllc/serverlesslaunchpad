import { redirect } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';
import { get } from 'svelte/store';
import { authStore } from '$lib/stores/auth_store';

export const load: LayoutLoad = async () => {
	const auth = get(authStore);

	// If not initialized yet, allow the page to load and let auth initialize
	if (!auth.initialized) {
		return {};
	}

	// If not authenticated, redirect to sign in
	if (!auth.isAuthenticated) {
		throw redirect(307, '/auth/signin');
	}

	return {};
};
