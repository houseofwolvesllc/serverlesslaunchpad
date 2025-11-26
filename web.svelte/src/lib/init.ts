/**
 * Application Initialization
 *
 * Provides initialization promise that can be awaited by components
 */

import { initializeEntryPoint } from '$lib/services/entry_point_provider';
import WebConfigurationStore from '$lib/config/web_config_store';
import { logger } from '$lib/logging';

// Create initialization promise that can be awaited by components
let initializationPromise: Promise<void> | null = null;

export function getInitializationPromise(): Promise<void> {
	if (!initializationPromise) {
		initializationPromise = (async () => {
			try {
				// Load configuration first
				await WebConfigurationStore.getConfig();
				logger.debug('[Init] Config loaded');

				// Initialize the entry point (baseUrl comes from web_config_store)
				await initializeEntryPoint();
				logger.info('[Init] Entry point initialized');
			} catch (error) {
				logger.error('[Init] Failed to initialize:', { error });
				throw error;
			}
		})();
	}
	return initializationPromise;
}
