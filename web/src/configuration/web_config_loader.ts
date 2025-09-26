import { WebConfig, WebConfigSchema } from './web_config_schema';

/**
 * Web Configuration Loader
 *
 * Loads configuration for the web frontend at build time.
 * Uses a simple approach where configuration is bundled into the build
 * rather than fetched at runtime.
 */
class WebConfigurationLoader {
    private static config: WebConfig | null = null;
    private static loadPromise: Promise<WebConfig> | null = null;

    /**
     * Load configuration for the current environment.
     * Uses Vite's import.meta.env.MODE to determine the environment.
     */
    static async load(): Promise<WebConfig> {
        // Return cached config if already loaded
        if (WebConfigurationLoader.config) {
            return WebConfigurationLoader.config;
        }

        // Return existing load promise if already in progress
        if (WebConfigurationLoader.loadPromise) {
            return WebConfigurationLoader.loadPromise;
        }

        // Start loading configuration
        WebConfigurationLoader.loadPromise = WebConfigurationLoader.loadConfiguration();
        WebConfigurationLoader.config = await WebConfigurationLoader.loadPromise;

        return WebConfigurationLoader.config;
    }

    /**
     * Internal method to load configuration from infrastructure file.
     */
    private static async loadConfiguration(): Promise<WebConfig> {
        // Get environment from Vite's mode
        const environment = import.meta.env.MODE || 'local';

        try {
            // Import the infrastructure configuration file
            // Vite will bundle this at build time
            const configModule = await import(`../config/${environment}.infrastructure.json`);
            const rawConfig = configModule.default || configModule;

            // Transform the infrastructure config to web config format
            const webConfig = WebConfigurationLoader.transformToWebConfig(rawConfig, environment);

            // Validate against schema
            const validatedConfig = WebConfigSchema.parse(webConfig);

            console.info(`[WebConfig] Loaded configuration for environment: ${environment}`);
            return validatedConfig;
        } catch (error) {
            console.error(`[WebConfig] Failed to load configuration for environment ${environment}:`, error);

            // Fallback to minimal configuration to prevent app crash
            return WebConfigurationLoader.createFallbackConfig(environment);
        }
    }

    /**
     * Transform infrastructure configuration to web configuration format.
     * This maps the infrastructure file format to the web schema format.
     */
    private static transformToWebConfig(infraConfig: any, environment: string): Partial<WebConfig> {
        return {
            environment: environment as any,

            aws: {
                region: infraConfig.aws?.region || 'us-west-2',
            },

            cognito: {
                user_pool_id: infraConfig.cognito?.user_pool_id || '',
                client_id: infraConfig.cognito?.client_id || '',
                identity_pool_id: infraConfig.cognito?.identity_pool_id,
                user_pool_provider_url: infraConfig.cognito?.user_pool_provider_url,
            },

            api: {
                base_url: infraConfig.api?.base_url || (environment === 'local' ? 'http://localhost:3001' : ''),
                timeout: infraConfig.api?.timeout || 30000,
            },

            features: {
                enable_mfa: infraConfig.features?.enable_mfa || false,
                enable_analytics: infraConfig.features?.enable_analytics || false,
                enable_notifications: infraConfig.features?.enable_notifications || false,
                enable_advanced_security: infraConfig.features?.enable_advanced_security || false,
                mock_auth: false, // Always false in production
                debug_mode: environment === 'local' || environment === 'development',
                enable_logging: environment === 'local' || environment === 'development',
                hot_reload: environment === 'local',
            },

            s3: infraConfig.s3
                ? {
                      upload_bucket: infraConfig.s3.upload_bucket,
                      static_bucket: infraConfig.s3.static_bucket,
                  }
                : undefined,

            alb: infraConfig.alb
                ? {
                      dns_name: infraConfig.alb.dns_name,
                  }
                : undefined,

            development:
                environment === 'local'
                    ? {
                          moto_url: infraConfig.aws?.endpoint_url || 'http://localhost:5555',
                          node_env: 'development',
                      }
                    : undefined,

            _generated: infraConfig._generated,
            _source: infraConfig._source,
        };
    }

    /**
     * Create a minimal fallback configuration when loading fails.
     * This prevents the app from crashing due to configuration issues.
     */
    private static createFallbackConfig(environment: string): WebConfig {
        console.warn(`[WebConfig] Using fallback configuration for environment: ${environment}`);

        return WebConfigSchema.parse({
            environment,

            aws: {
                region: 'us-west-2',
            },

            cognito: {
                user_pool_id: '',
                client_id: '',
            },

            api: {
                base_url: environment === 'local' ? 'http://localhost:3001' : '',
                timeout: 30000,
            },

            features: {
                enable_mfa: false,
                enable_analytics: false,
                enable_notifications: false,
                enable_advanced_security: false,
                mock_auth: false,
                debug_mode: false,
                enable_logging: false,
                hot_reload: false,
            },
        });
    }

    /**
     * Reset the configuration (useful for testing).
     */
    static reset(): void {
        WebConfigurationLoader.config = null;
        WebConfigurationLoader.loadPromise = null;
    }

    /**
     * Get the current loaded configuration without triggering a load.
     * Returns null if not yet loaded.
     */
    static getCurrent(): WebConfig | null {
        return WebConfigurationLoader.config;
    }
}

export default WebConfigurationLoader;
