import {
    Authenticator,
    Authority,
    Injectable,
    SessionRepository,
    UserRepository,
} from "@houseofwolves/serverlesslaunchpad.core";
import {
    ApplicationSecretsStore,
    InfrastructureConfigurationStore,
} from "@houseofwolves/serverlesslaunchpad.framework";
import "reflect-metadata";
import { beforeEach, describe, expect, it } from "vitest";
import { getContainer } from "../src/container";

describe("AppContainer", () => {
    let container: ReturnType<typeof getContainer>;

    beforeEach(() => {
        container = getContainer();
    });

    it("should return the same container instance on multiple calls", () => {
        const container1 = getContainer();
        const container2 = getContainer();
        expect(container1).toStrictEqual(container2);
    });

    it("should resolve Authority as a singleton", () => {
        const authority1 = container.resolve(Authority);
        const authority2 = container.resolve(Authority);
        expect(authority1).toStrictEqual(authority2);
        expect(authority1).toBeDefined();
    });

    it("should resolve Authenticator as a singleton", () => {
        const auth1 = container.resolve(Authenticator);
        const auth2 = container.resolve(Authenticator);
        expect(auth1).toStrictEqual(auth2);
        expect(auth1).toBeDefined();
    });

    it("should resolve SessionRepository as a singleton", () => {
        const repo1 = container.resolve(SessionRepository);
        const repo2 = container.resolve(SessionRepository);
        expect(repo1).toStrictEqual(repo2);
        expect(repo1).toBeDefined();
    });

    it("should resolve UserRepository as a singleton", () => {
        const repo1 = container.resolve(UserRepository);
        const repo2 = container.resolve(UserRepository);
        expect(repo1).toStrictEqual(repo2);
        expect(repo1).toBeDefined();
    });

    it("should resolve role-based configuration stores", () => {
        const infraConfig = container.resolve(InfrastructureConfigurationStore);
        const secretsConfig = container.resolve(ApplicationSecretsStore);

        expect(infraConfig).toBeDefined();
        expect(secretsConfig).toBeDefined();
        expect(infraConfig.constructor.name).toBe("InfrastructureConfigurationStore");
        expect(secretsConfig.constructor.name).toBe("ApplicationSecretsStore");
    });

    it.skip("should resolve concrete controllers without explicit binding", () => {
        // Define a test controller
        @Injectable()
        class TestController {
            constructor(private sessionRepository: SessionRepository, private userRepository: UserRepository) {}

            getSessionRepository() {
                return this.sessionRepository;
            }

            getUserRepository() {
                return this.userRepository;
            }
        }

        // Controllers can be resolved without binding since they're concrete classes
        const controller = container.resolve(TestController);
        expect(controller).toBeDefined();
        expect(controller).toBeInstanceOf(TestController);

        // Dependencies should be properly injected
        expect(controller.getSessionRepository()).toBeDefined();
        expect(controller.getUserRepository()).toBeDefined();

        // Dependencies should be singletons
        expect(controller.getSessionRepository()).toStrictEqual(container.resolve(SessionRepository));
        expect(controller.getUserRepository()).toStrictEqual(container.resolve(UserRepository));
    });

    it("should resolve InfrastructureConfigurationStore as distinct type", () => {
        const container = getContainer();

        const infraStore = container.resolve(InfrastructureConfigurationStore);

        expect(infraStore).toBeInstanceOf(InfrastructureConfigurationStore);
        expect(infraStore.constructor.name).toBe("InfrastructureConfigurationStore");
    });

    it("should resolve ApplicationSecretsStore as distinct type", () => {
        const container = getContainer();

        const secretsStore = container.resolve(ApplicationSecretsStore);

        expect(secretsStore).toBeInstanceOf(ApplicationSecretsStore);
        expect(secretsStore.constructor.name).toBe("ApplicationSecretsStore");
    });

    it("should resolve different instances for different store types", () => {
        const container = getContainer();

        const infraStore = container.resolve(InfrastructureConfigurationStore);
        const secretsStore = container.resolve(ApplicationSecretsStore);

        expect(infraStore).not.toBe(secretsStore);
        expect(infraStore).toBeInstanceOf(InfrastructureConfigurationStore);
        expect(secretsStore).toBeInstanceOf(ApplicationSecretsStore);
    });

    it("should resolve same singleton instance for same store type", () => {
        const container = getContainer();

        const infraStore1 = container.resolve(InfrastructureConfigurationStore);
        const infraStore2 = container.resolve(InfrastructureConfigurationStore);

        expect(infraStore1).toBe(infraStore2); // Same singleton instance
    });
});
