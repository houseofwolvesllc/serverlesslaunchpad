import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { authStore } from '$lib/stores/auth_store';
import { get } from 'svelte/store';

export const load: PageLoad = async () => {
	// Check if user is authenticated
	const auth = get(authStore);

	if (auth.isAuthenticated) {
		// Redirect to dashboard
		throw redirect(307, '/dashboard');
	} else {
		// Redirect to sign in page
		throw redirect(307, '/auth/signin');
	}
};
