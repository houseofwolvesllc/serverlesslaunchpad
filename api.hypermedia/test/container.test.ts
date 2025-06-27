import "reflect-metadata";
import { describe, it, expect, beforeEach } from "vitest";
import { getContainer } from "../src/container";
import { 
    Authority,
    SessionRepository,
    UserRepository,
    ConfigurationStore,
    Authenticator,
    Injectable
} from "@houseofwolves/serverlesslaunchpad.core";

describe("AppContainer", () => {
    let container: ReturnType<typeof getContainer>;

    beforeEach(() => {
        container = getContainer();
    });

    it("should return the same container instance on multiple calls", () => {
        const container1 = getContainer();
        const container2 = getContainer();
        expect(container1).toBe(container2);
    });

    it("should resolve Authority as a singleton", () => {
        const authority1 = container.resolve(Authority);
        const authority2 = container.resolve(Authority);
        expect(authority1).toBe(authority2);
        expect(authority1).toBeDefined();
    });

    it("should resolve Authenticator as a singleton", () => {
        const auth1 = container.resolve(Authenticator);
        const auth2 = container.resolve(Authenticator);
        expect(auth1).toBe(auth2);
        expect(auth1).toBeDefined();
    });

    it("should resolve SessionRepository as a singleton", () => {
        const repo1 = container.resolve(SessionRepository);
        const repo2 = container.resolve(SessionRepository);
        expect(repo1).toBe(repo2);
        expect(repo1).toBeDefined();
    });

    it("should resolve UserRepository as a singleton", () => {
        const repo1 = container.resolve(UserRepository);
        const repo2 = container.resolve(UserRepository);
        expect(repo1).toBe(repo2);
        expect(repo1).toBeDefined();
    });

    it("should resolve ConfigurationStore based on environment", () => {
        const config = container.resolve(ConfigurationStore);
        expect(config).toBeDefined();
        // Should be EnvConfigurationStore by default
        expect(config.constructor.name).toBe("EnvConfigurationStore");
    });

    it("should resolve concrete controllers without explicit binding", () => {
        // Define a test controller
        @Injectable()
        class TestController {
            constructor(
                private authority: Authority,
                private sessionRepository: SessionRepository
            ) {}

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
        expect(controller.getAuthority()).toBe(container.resolve(Authority));
        expect(controller.getSessionRepository()).toBe(container.resolve(SessionRepository));
    });
});