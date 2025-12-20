/**
 * SvelteKit Client Hooks
 *
 * This file runs on the client side before any page loads.
 * Perfect place to initialize global configurations like Moto shims.
 */

// Import Moto shims - this triggers the auto-apply logic at module load
import '$lib/config/moto_amplify_shims';
import { getInitializationPromise } from '$lib/init';
import { logger } from '$lib/logging';

logger.info('[SvelteKit] Client hooks initialized - Moto shims loaded');

// Start initialization immediately
getInitializationPromise();
