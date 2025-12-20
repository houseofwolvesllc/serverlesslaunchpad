import {
    ApiKeyRepository,
    Authenticator,
    Container,
    Environment,
    LogLevel,
    SessionRepository,
    UserRepository,
} from "@houseofwolves/serverlesslaunchpad.core";
import {
    AthenaApiKeyRepository,
    AthenaSessionRepository,
    AthenaUserRepository,
    AwsSecretsConfigurationStore,
    FileConfigurationStore,
    SystemAuthenticator,
    CachedConfigurationStore,
    InfrastructureConfigurationStore,
    ApplicationSecretsStore,
    ApiConfigSchema,
    SecretsConfigSchema,
} from "@houseofwolves/serverlesslaunchpad.framework";
import * as path from "path";
import { fileURLToPath } from "url";
import { ApiLogger } from "./logging";

/**
 * Singleton container instance for the API.Hypermedia application.
 * Following the singleton pattern to ensure all parts of the application
 * use the same container instance for dependency resolution.
 */
class AppContainer {
    private static instance: Container;

    /**
     * Get the singleton container instance.
     * Initializes the container with all necessary bindings on first access.
     */
    static getInstance(): Container {
        if (!AppContainer.instance) {
            AppContainer.instance = new Container();
            AppContainer.bindServices();
        }
        return AppContainer.instance;
    }

    /**
     * Bind all abstract classes from core to their concrete implementations from framework.
     * Controllers don't need binding as they are concrete classes that can be resolved directly.
     */
    private static bindServices(): void {
        const container = AppContainer.instance;

        // Authentication bindings
        container.bind(Authenticator).to(SystemAuthenticator).asSingleton();
        container.bind(SessionRepository).to(AthenaSessionRepository).asSingleton();
        container.bind(ApiKeyRepository).to(AthenaApiKeyRepository).asSingleton();

        // User management bindings
        container.bind(UserRepository).to(AthenaUserRepository).asSingleton();

        // Infrastructure configuration store (non-sensitive data with infinite caching)
        container
            .bind(InfrastructureConfigurationStore)
            .toFactory(() => {
                const environment = AppContainer.getEnvironment();
                const baseStore = new FileConfigurationStore(
                    ApiConfigSchema,
                    path.join(path.dirname(fileURLToPath(import.meta.url)), "../config"),
                    `${environment}.infrastructure.json`
                );
                // Cache indefinitely - infrastructure config rarely changes
                const cachedStore = new CachedConfigurationStore(baseStore, Infinity);
                return new InfrastructureConfigurationStore(cachedStore);
            })
            .asSingleton();

        // Application secrets store (sensitive data with 15-minute caching)
        container
            .bind(ApplicationSecretsStore)
            .toFactory(() => {
                const environment = AppContainer.getEnvironment();
                const secretsConfig = environment === 'local'
                    ? { endpoint: 'http://localhost:5555', region: 'us-west-2' }
                    : undefined;

                const baseStore = new AwsSecretsConfigurationStore(
                    SecretsConfigSchema,
                    environment,
                    secretsConfig,
                    "serverlesslaunchpad.secrets"
                );
                // Cache for 15 minutes - secrets may be rotated
                const cachedStore = new CachedConfigurationStore(baseStore, 15);
                return new ApplicationSecretsStore(cachedStore);
            })
            .asSingleton();


        container
            .bind(ApiLogger)
            .toFactory(() => {
                const logLevel = AppContainer.getLogLevelForEnvironment(AppContainer.getEnvironment());
                return new ApiLogger(logLevel);
            })
            .asSingleton();
    }

    /**
     * Get appropriate log level based on NODE_ENV
     */
    private static getLogLevelForEnvironment(environment: Environment): LogLevel {
        switch (environment) {
            case Environment.Development:
                return LogLevel.DEBUG;
            case Environment.Staging:
                return LogLevel.WARN;
            case Environment.Production:
                return LogLevel.WARN;
            default:
                return LogLevel.INFO;
        }
    }

    private static getEnvironment(): Environment {
        const environment = process.env.NODE_ENV;
        if (!environment) {
            throw new Error("NODE_ENV is not set");
        }
        return environment as Environment;
    }
}

/**
 * Export a function to get the container instance.
 * This ensures the singleton is properly initialized before use.
 */
export const getContainer = (): Container => {
    return AppContainer.getInstance();
};
