import { WebConfig, WebConfigSchema } from './web_config_schema';

/**
 * Web Configuration Store
 *
 * Manages configuration for the web frontend.
 * Follows the same pattern as API's IConfigurationStore but without DI.
 * Configuration is bundled at build time via Vite.
 */
class WebConfigurationStore {
    private static config: WebConfig | null = null;
    private static loadPromise: Promise<WebConfig> | null = null;

    /**
     * Get configuration for the current environment.
     * Automatically loads on first access and caches for subsequent calls.
     * Uses Vite's import.meta.env.MODE to determine the environment.
     */
    static async getConfig(): Promise<WebConfig> {
        // Return cached config if already loaded
        if (WebConfigurationStore.config) {
            return WebConfigurationStore.config;
        }

        // Return existing load promise if already in progress
        if (WebConfigurationStore.loadPromise) {
            return WebConfigurationStore.loadPromise;
        }

        // Start loading configuration
        WebConfigurationStore.loadPromise = WebConfigurationStore.loadConfiguration();
        WebConfigurationStore.config = await WebConfigurationStore.loadPromise;

        return WebConfigurationStore.config;
    }

    /**
     * Internal method to load configuration from infrastructure file.
     */
    private static async loadConfiguration(): Promise<WebConfig> {
        // Get environment from Vite's mode (default to moto for local development)
        const environment = import.meta.env.MODE || 'moto';

        try {
            // Import the infrastructure configuration file
            // Vite will bundle this at build time
            const configModule = await import(`../../config/${environment}.infrastructure.json`);
            const rawConfig = configModule.default || configModule;

            // Validate against schema directly - no transformation needed
            const validatedConfig = WebConfigSchema.parse(rawConfig);

            console.info(`[WebConfig] Loaded configuration for environment: ${environment}`);
            return validatedConfig;
        } catch (error) {
            console.error(`[WebConfig] Failed to load configuration for environment ${environment}:`, error);

            // Fail fast - configuration issues should be fixed immediately
            throw new Error(
                `Configuration failed to load for environment: ${environment}. ` +
                `Please ensure config/${environment}.infrastructure.json exists and is valid. ` +
                `Error: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    /**
     * Reset the configuration (useful for testing).
     */
    static reset(): void {
        WebConfigurationStore.config = null;
        WebConfigurationStore.loadPromise = null;
    }

    /**
     * Get the current loaded configuration without triggering a load.
     * Returns null if not yet loaded.
     */
    static getCurrent(): WebConfig | null {
        return WebConfigurationStore.config;
    }
}

export default WebConfigurationStore;
