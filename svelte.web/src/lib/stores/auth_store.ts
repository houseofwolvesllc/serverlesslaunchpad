import { writable, derived } from 'svelte/store';
import type { User } from '$lib/auth/types';

export interface AuthState {
	user: User | null;
	isAuthenticated: boolean;
	initialized: boolean;
}

const initialState: AuthState = {
	user: null,
	isAuthenticated: false,
	initialized: false,
};

/**
 * Authentication state store
 *
 * Manages user authentication state using AWS Cognito
 */
function createAuthStore() {
	const { subscribe, set, update } = writable<AuthState>(initialState);

	return {
		subscribe,
		setUser: (user: User | null) => {
			update(state => ({
				...state,
				user,
				isAuthenticated: user !== null,
			}));
		},
		setInitialized: (initialized: boolean) => {
			update(state => ({ ...state, initialized }));
		},
		signOut: () => {
			set(initialState);
		},
		reset: () => {
			set(initialState);
		},
	};
}

export const authStore = createAuthStore();

// Derived stores
export const isAuthenticated = derived(authStore, $auth => $auth.isAuthenticated);
export const currentUser = derived(authStore, $auth => $auth.user);
export const authInitialized = derived(authStore, $auth => $auth.initialized);
