/**
 * SvelteKit Client Hooks
 *
 * This file runs on the client side before any page loads.
 * Perfect place to initialize global configurations like Moto shims.
 */

// Import shared shims from web.commons
import { applyMotoShims } from '@houseofwolves/serverlesslaunchpad.web.commons';
import WebConfigurationStore from '$lib/config/web_config_store';
import { getInitializationPromise } from '$lib/init';
import { logger } from '$lib/logging';

// Apply Moto shims FIRST to ensure they're applied before any AWS Amplify code runs
applyMotoShims(() => WebConfigurationStore.getConfig()).then(() => {
	logger.info('[SvelteKit] Client hooks initialized - Moto shims loaded');
});

// Start initialization immediately
getInitializationPromise();
