/**
 * Web Configuration Store - Vite Wrapper
 *
 * This file provides a Vite-specific wrapper around the framework-agnostic
 * WebConfigurationStore from web.commons. It provides the Vite-specific
 * configuration loader.
 */

import { createWebConfigStore } from '@houseofwolves/serverlesslaunchpad.web.commons';

/**
 * Vite-specific configuration loader
 * Uses Vite's dynamic import for JSON config files
 */
async function viteConfigLoader(environment: string): Promise<any> {
    const configModule = await import(`../../config/${environment}.infrastructure.json`);
    return configModule.default || configModule;
}

/**
 * Vite-specific environment getter
 * Uses Vite's import.meta.env.MODE
 */
function viteGetEnvironment(): string {
    return import.meta.env.MODE || 'moto';
}

/**
 * Singleton web configuration store configured for Vite
 */
const WebConfigurationStore = createWebConfigStore(
    viteConfigLoader,
    viteGetEnvironment
);

export default WebConfigurationStore;

/**
 * Re-export types from web.commons
 */
export type { WebConfig } from '@houseofwolves/serverlesslaunchpad.web.commons';
export { WebConfigSchema } from '@houseofwolves/serverlesslaunchpad.web.commons';
