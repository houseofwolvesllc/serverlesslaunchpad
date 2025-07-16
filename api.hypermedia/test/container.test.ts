import {
    Authenticator,
    Authority,
    ConfigurationStore,
    Injectable,
    SessionRepository,
    UserRepository,
} from "@houseofwolves/serverlesslaunchpad.core";
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

    it("should resolve ConfigurationStore based on environment", () => {
        const config = container.resolve(ConfigurationStore, "configuration");
        expect(config).toBeDefined();
        expect(config.constructor.name).toBe("FileConfigurationStore");
    });

    it("should resolve concrete controllers without explicit binding", () => {
        // Define a test controller
        @Injectable()
        class TestController {
            constructor(private authority: Authority, private sessionRepository: SessionRepository) {}

            getAuthority() {
                return this.authority;
            }

            getSessionRepository() {
                return this.sessionRepository;
            }
        }

        // Controllers can be resolved without binding since they're concrete classes
        const controller = container.resolve(TestController);
        expect(controller).toBeDefined();
        expect(controller).toBeInstanceOf(TestController);

        // Dependencies should be properly injected
        expect(controller.getAuthority()).toBeDefined();
        expect(controller.getSessionRepository()).toBeDefined();

        // Dependencies should be singletons
        expect(controller.getAuthority()).toStrictEqual(container.resolve(Authority));
        expect(controller.getSessionRepository()).toStrictEqual(container.resolve(SessionRepository));
    });
});
