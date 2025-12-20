import { writable } from 'svelte/store';
import { toast as sonnerToast } from 'svelte-sonner';

/**
 * Toast item interface
 */
export interface Toast {
	id: string | number;
	message: string;
	variant: 'success' | 'error' | 'warning' | 'info';
}

/**
 * Toast store - writable store with helper methods
 */
function createToastStore() {
	const { subscribe, set, update } = writable<Toast[]>([]);

	return {
		subscribe,
		success: (message: string) => {
			sonnerToast.success(message);
			const id = Date.now() + Math.random();
			update((toasts) => [...toasts, { id, message, variant: 'success' }]);
			setTimeout(() => {
				update((toasts) => toasts.filter((t) => t.id !== id));
			}, 5000);
			return id;
		},
		error: (message: string) => {
			sonnerToast.error(message);
			const id = Date.now() + Math.random();
			update((toasts) => [...toasts, { id, message, variant: 'error' }]);
			setTimeout(() => {
				update((toasts) => toasts.filter((t) => t.id !== id));
			}, 5000);
			return id;
		},
		warning: (message: string) => {
			sonnerToast.warning(message);
			const id = Date.now() + Math.random();
			update((toasts) => [...toasts, { id, message, variant: 'warning' }]);
			setTimeout(() => {
				update((toasts) => toasts.filter((t) => t.id !== id));
			}, 5000);
			return id;
		},
		info: (message: string) => {
			sonnerToast.info(message);
			const id = Date.now() + Math.random();
			update((toasts) => [...toasts, { id, message, variant: 'info' }]);
			setTimeout(() => {
				update((toasts) => toasts.filter((t) => t.id !== id));
			}, 5000);
			return id;
		},
		remove: (id: string | number) => {
			update((toasts) => toasts.filter((t) => t.id !== id));
		},
	};
}

export const toastStore = createToastStore();
