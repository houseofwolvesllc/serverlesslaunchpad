import {
    Authenticator, ConfigurationStore, Container, SessionRepository,
    UserRepository
} from "@houseofwolves/serverlesslaunchpad.core";
import {
    AthenaSessionRepository,
    AthenaUserRepository,
    AwsSecretsConfigurationStore,
    EnvConfigurationStore,
    SystemAuthenticator
} from "@houseofwolves/serverlesslaunchpad.framework";
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
        
        // User management bindings
        container.bind(UserRepository).to(AthenaUserRepository).asSingleton();
        
        // Configuration bindings
        // Determine which configuration store to use based on environment
        const configStoreImpl = process.env.USE_AWS_SECRETS === "true" 
            ? AwsSecretsConfigurationStore 
            : EnvConfigurationStore;
        container.bind(ConfigurationStore).to(configStoreImpl).asSingleton();

        // Logging bindings
        container.bind(ApiLogger).toSelf().asSingleton();

        // Note: ApiKeyRepository implementation is not yet available in framework
        // This will need to be added when the concrete implementation is created
        // container.bind(ApiKeyRepository).to(AthenaApiKeyRepository).asSingleton();
    }
}

/**
 * Export a function to get the container instance.
 * This ensures the singleton is properly initialized before use.
 */
export const getContainer = (): Container => AppContainer.getInstance();