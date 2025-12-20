import { toast as sonnerToast } from 'svelte-sonner';

/**
 * Toast notification wrapper using svelte-sonner
 */
export const toastStore = {
	success: (message: string) => sonnerToast.success(message),
	error: (message: string) => sonnerToast.error(message),
	warning: (message: string) => sonnerToast.warning(message),
	info: (message: string) => sonnerToast.info(message),
};
