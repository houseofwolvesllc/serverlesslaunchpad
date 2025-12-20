import {
    ApiKeyRepository,
    Authenticator,
    Container,
    Environment,
    JwtVerifier,
    LogLevel,
    SessionRepository,
    UserRepository,
} from "@houseofwolves/serverlesslaunchpad.core";
import {
    ApiConfigSchema,
    ApplicationSecretsStore,
    AwsSecretsConfigurationStore,
    CachedConfigurationStore,
    DynamoDbApiKeyRepository,
    DynamoDbClientFactory,
    DynamoDbSessionRepository,
    DynamoDbUserRepository,
    FileConfigurationStore,
    InfrastructureConfigurationStore,
    JoseJwtVerifier,
    SecretsConfigSchema,
    SystemAuthenticator,
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
    private static infraConfigStore: InfrastructureConfigurationStore | undefined;

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

        // Infrastructure configuration store binding - created synchronously
        container
            .bind(InfrastructureConfigurationStore)
            .toFactory(() => AppContainer.getInfraConfigStore())
            .asSingleton();

        // Authentication bindings
        container.bind(Authenticator).to(SystemAuthenticator).asSingleton();

        // DynamoDB client factory - creates and manages DynamoDB client instances
        container
            .bind(DynamoDbClientFactory)
            .toFactory(() => {
                const configStore = AppContainer.getInfraConfigStore();
                return new DynamoDbClientFactory(configStore);
            })
            .asSingleton();

        // DynamoDB repository bindings - factory injected automatically
        container.bind(SessionRepository).to(DynamoDbSessionRepository).asSingleton();
        container.bind(ApiKeyRepository).to(DynamoDbApiKeyRepository).asSingleton();
        container.bind(UserRepository).to(DynamoDbUserRepository).asSingleton();

        // Application secrets store (sensitive data with 15-minute caching)
        container
            .bind(ApplicationSecretsStore)
            .toFactory(() => {
                const environment = AppContainer.getEnvironment();
                const secretsConfig =
                    environment === "local" ? { endpoint: "http://localhost:5555", region: "us-west-2" } : undefined;

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

        container.bind(JwtVerifier).to(JoseJwtVerifier).asSingleton();

        container
            .bind(ApiLogger)
            .toFactory(() => {
                const logLevel = AppContainer.getLogLevelForEnvironment(AppContainer.getEnvironment());
                return new ApiLogger(logLevel);
            })
            .asSingleton();
    }

    /**
     * Synchronously create and cache infrastructure config store
     * No async operations - just creates the store object
     */
    private static getInfraConfigStore(): InfrastructureConfigurationStore {
        if (!AppContainer.infraConfigStore) {
            const environment = AppContainer.getEnvironment();
            const baseStore = new FileConfigurationStore(
                ApiConfigSchema,
                path.join(path.dirname(fileURLToPath(import.meta.url)), "../config"),
                `${environment}.infrastructure.json`
            );
            const cachedStore = new CachedConfigurationStore(baseStore, Infinity);
            AppContainer.infraConfigStore = new InfrastructureConfigurationStore(cachedStore);
        }
        return AppContainer.infraConfigStore;
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
