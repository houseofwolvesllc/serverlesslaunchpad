import {
    ApiKeyRepository,
    Authenticator,
    ConfigurationStore,
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
    CompositeConfigurationStore,
    FileConfigurationStore,
    SystemAuthenticator,
} from "@houseofwolves/serverlesslaunchpad.framework";
import * as path from "path";
import { fileURLToPath } from "url";
import { z } from "zod";
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

        container
            .bind(
                ConfigurationStore<{
                    auth: { cognito: { userPoolId: string; userPoolClientId: string } };
                    session_token_salt: string;
                }>
            )
            .toFactory(() => {
                const configSchema = z.object({
                    auth: z.object({
                        cognito: z.object({
                            userPoolId: z.string(),
                            userPoolClientId: z.string(),
                        }),
                    }),
                    session_token_salt: z.string(),
                });

                const compositeConfigurationStore = new CompositeConfigurationStore(configSchema);

                compositeConfigurationStore.addStore(
                    new FileConfigurationStore(
                        configSchema,
                        path.join(path.dirname(fileURLToPath(import.meta.url)), "../config"),
                        `${AppContainer.getEnvironment()}.config.json`
                    )
                );

                compositeConfigurationStore.addStore(
                    new AwsSecretsConfigurationStore(configSchema, AppContainer.getEnvironment())
                );

                return compositeConfigurationStore;
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
