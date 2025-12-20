/**
 * SvelteKit Client Hooks
 *
 * This file runs on the client side before any page loads.
 * Perfect place to initialize global configurations like Moto shims.
 */

// Import Moto shims - this triggers the auto-apply logic at module load
import '$lib/config/moto_amplify_shims';
import { initializeEntryPoint } from '$lib/services/entry_point_provider';
import WebConfigurationStore from '$lib/config/web_config_store';
import { logger } from '$lib/logging';

logger.info('[SvelteKit] Client hooks initialized - Moto shims loaded');

// Initialize the entry point (baseUrl comes from web_config_store)
initializeEntryPoint()
	.then(() => {
		logger.info('[SvelteKit] Entry point initialized');
	})
	.catch(error => {
		logger.error('[SvelteKit] Failed to initialize entry point:', { error });
	});
