import { type WebConfig, WebConfigSchema } from './web_config_schema';

/**
 * Configuration loader function type
 * Must be provided by the framework-specific implementation
 */
export type ConfigLoader = (environment: string) => Promise<any>;

/**
 * Web Configuration Store
 *
 * Framework-agnostic configuration manager for web frontends.
 * Follows the same pattern as API's IConfigurationStore but without DI.
 *
 * This is the pure TypeScript core - each framework provides its own loader:
 * - React/Vite: Uses import(`../../config/${env}.infrastructure.json`)
 * - Svelte/Vite: Uses import(`../../config/${env}.infrastructure.json`)
 * - Other: Custom loader based on build tool
 */
export class WebConfigurationStore {
    private config: WebConfig | null = null;
    private loadPromise: Promise<WebConfig> | null = null;

    constructor(
        private configLoader: ConfigLoader,
        private getEnvironment: () => string
    ) {}

    /**
     * Get configuration for the current environment.
     * Automatically loads on first access and caches for subsequent calls.
     */
    async getConfig(): Promise<WebConfig> {
        // Return cached config if already loaded
        if (this.config) {
            return this.config;
        }

        // Return existing load promise if already in progress
        if (this.loadPromise) {
            return this.loadPromise;
        }

        // Start loading configuration
        this.loadPromise = this.loadConfiguration();
        this.config = await this.loadPromise;

        return this.config;
    }

    /**
     * Internal method to load configuration from infrastructure file.
     */
    private async loadConfiguration(): Promise<WebConfig> {
        const environment = this.getEnvironment();

        try {
            // Use the provided loader to get raw config
            const rawConfig = await this.configLoader(environment);

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
    reset(): void {
        this.config = null;
        this.loadPromise = null;
    }

    /**
     * Get the current loaded configuration without triggering a load.
     * Returns null if not yet loaded.
     */
    getCurrent(): WebConfig | null {
        return this.config;
    }
}

/**
 * Factory function to create a WebConfigurationStore instance
 *
 * @param configLoader - Function to load config for a given environment
 * @param getEnvironment - Function to get current environment name
 * @returns New WebConfigurationStore instance
 *
 * @example
 * ```typescript
 * // Vite/React implementation
 * const configStore = createWebConfigStore(
 *   async (env) => {
 *     const module = await import(`../../config/${env}.infrastructure.json`);
 *     return module.default || module;
 *   },
 *   () => import.meta.env.MODE || 'moto'
 * );
 * ```
 */
export function createWebConfigStore(
    configLoader: ConfigLoader,
    getEnvironment: () => string
): WebConfigurationStore {
    return new WebConfigurationStore(configLoader, getEnvironment);
}
