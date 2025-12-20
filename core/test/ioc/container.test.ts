import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { Container, Inject, Injectable } from "../../src/ioc";

describe("Container", () => {
    interface UserRepository {
        getUser(id: string): { id: string; name: string };
    }

    abstract class AbstractUserRepository implements UserRepository {
        abstract getUser(id: string): { id: string; name: string };
    }

    class MockUserRepository extends AbstractUserRepository {
        getUser(id: string): { id: string; name: string } {
            return { id, name: "John Doe" };
        }
    }
    describe("Binding", () => {
        it("Should bind type to implementation", () => {
            const container = new Container();
            container.bind(AbstractUserRepository).to(MockUserRepository);

            const userRepository = container.resolve(AbstractUserRepository);

            expect(userRepository).toBeInstanceOf(MockUserRepository);
        });

        it("Should bind type to implementation with name", () => {
            const container = new Container();
            container.bind(AbstractUserRepository).to(MockUserRepository).named("userRepository");

            const userRepository = container.resolve(AbstractUserRepository, "userRepository");

            expect(userRepository).toBeInstanceOf(MockUserRepository);
        });

        it("Should bind type to implementation with singleton lifecycle", () => {
            const container = new Container();
            container.bind(AbstractUserRepository).to(MockUserRepository).asSingleton();

            const userRepository = container.resolve(AbstractUserRepository);
            const userRepository2 = container.resolve(AbstractUserRepository);

            expect(userRepository).toBe(userRepository2);
        });

        it("Should handle key collisions correctly with different named bindings", () => {
            const container = new Container();

            // Create two different mock implementations
            class MockUserRepositoryA extends AbstractUserRepository {
                getUser(id: string): { id: string; name: string } {
                    return { id, name: "User A" };
                }
            }

            class MockUserRepositoryB extends AbstractUserRepository {
                getUser(id: string): { id: string; name: string } {
                    return { id, name: "User B" };
                }
            }

            container.bind(AbstractUserRepository).to(MockUserRepositoryA).named("repoA");
            container.bind(AbstractUserRepository).to(MockUserRepositoryB).named("repoB");

            const repoA = container.resolve(AbstractUserRepository, "repoA");
            const repoB = container.resolve(AbstractUserRepository, "repoB");

            expect(repoA).toBeInstanceOf(MockUserRepositoryA);
            expect(repoB).toBeInstanceOf(MockUserRepositoryB);
            expect(repoA).not.toBe(repoB);
            expect(repoA.getUser("1").name).toBe("User A");
            expect(repoB.getUser("1").name).toBe("User B");
        });

        it("Should bind concrete class to itself using toSelf", () => {
            const container = new Container();
            
            class ConcreteService {
                getValue(): string {
                    return "concrete";
                }
            }
            
            container.bind(ConcreteService).toSelf();
            
            const service = container.resolve(ConcreteService);
            
            expect(service).toBeInstanceOf(ConcreteService);
            expect(service.getValue()).toBe("concrete");
        });

        it("Should bind concrete class to itself as singleton using toSelf", () => {
            const container = new Container();
            
            class ConcreteService {
                private static counter = 0;
                public readonly instanceId: number;
                
                constructor() {
                    this.instanceId = ++ConcreteService.counter;
                }
                
                getValue(): string {
                    return `concrete-${this.instanceId}`;
                }
            }
            
            container.bind(ConcreteService).toSelf().asSingleton();
            
            const service1 = container.resolve(ConcreteService);
            const service2 = container.resolve(ConcreteService);
            
            expect(service1).toBe(service2);
            expect(service1.instanceId).toBe(service2.instanceId);
            expect(service1.getValue()).toBe("concrete-1");
        });

        it("Should throw error when binding with duplicate key/type composite", () => {
            const container = new Container();

            container.bind(AbstractUserRepository).to(MockUserRepository).named("duplicate");

            expect(() => {
                container.bind(AbstractUserRepository).to(MockUserRepository).named("duplicate");
            }).toThrow("Service duplicate-AbstractUserRepository already registered");
        });
    });

    describe("Resolving", () => {
        it("Should resolve constructor parameters", () => {
            const container = new Container();

            @Injectable()
            class UserService {
                constructor(private userRepository: AbstractUserRepository) {}
                getUser(id: string) {
                    return this.userRepository.getUser(id);
                }
            }

            container.bind(AbstractUserRepository).to(MockUserRepository);

            const userService = container.resolve(UserService);
            const user = userService.getUser("123");

            expect(userService).toBeInstanceOf(UserService);
            expect(user).toEqual({ id: "123", name: "John Doe" });
        });

        it("Should resolve named constructor parameters", () => {
            const container = new Container();

            class MockUserRepositoryUnnamed extends AbstractUserRepository {
                getUser(id: string): { id: string; name: string } {
                    return { id, name: "Not John Doe" };
                }
            }

            @Injectable()
            class UserService {
                constructor(@Inject("userRepository") private userRepository: AbstractUserRepository) {}
                getUser(id: string) {
                    return this.userRepository.getUser(id);
                }
            }

            container.bind(AbstractUserRepository).to(MockUserRepositoryUnnamed);
            container.bind(AbstractUserRepository, { name: "userRepository" }).to(MockUserRepository);

            const userService = container.resolve(UserService);
            const user = userService.getUser("123");

            expect(userService).toBeInstanceOf(UserService);
            expect(user).toEqual({ id: "123", name: "John Doe" });
        });

        it("Should resolve constructor parameters with factory", () => {
            const container = new Container();

            @Injectable()
            class UserService {
                constructor(private userRepository: AbstractUserRepository) {}
                getUser(id: string) {
                    return this.userRepository.getUser(id);
                }
            }

            container.bind(AbstractUserRepository).toFactory(() => new MockUserRepository());

            const userService = container.resolve(UserService);
            const user = userService.getUser("123");

            expect(userService).toBeInstanceOf(UserService);
            expect(user).toEqual({ id: "123", name: "John Doe" });
        });
    });
});
