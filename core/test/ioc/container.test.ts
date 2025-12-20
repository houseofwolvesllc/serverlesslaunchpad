import { beforeEach, describe, expect, it } from "vitest";
import { Container, Inject } from "../../src/ioc/container";

describe("Container", () => {
    let container: Container;

    beforeEach(() => {
        container = new Container();
    });

    describe("registration and resolution", () => {
        const TestService = Symbol("TestService");
        interface TestService {
            getValue(): string;
        }

        class TestServiceImplementation implements TestService {
            getValue(): string {
                return "test";
            }
        }

        it("should register and resolve a singleton service", () => {
            container.register<TestService>(TestServiceImplementation, {
                lifecycle: "singleton",
                token: TestService,
            });
            const instance1 = container.get<TestService>(TestService);
            const instance2 = container.get<TestService>(TestService);

            expect(instance1).toBeInstanceOf(TestServiceImplementation);
            expect(instance2).toBeInstanceOf(TestServiceImplementation);
            expect(instance1).toBe(instance2); // Same instance
        });

        it("should register and resolve a transient service", () => {
            container.register<TestService>(TestServiceImplementation, {
                lifecycle: "transient",
                token: TestService,
            });
            const instance1 = container.get<TestService>(TestService);
            const instance2 = container.get<TestService>(TestService);

            expect(instance1).toBeInstanceOf(TestServiceImplementation);
            expect(instance2).toBeInstanceOf(TestServiceImplementation);
            expect(instance1).not.toBe(instance2); // Different instances
        });

        it("should register and resolve a scoped service", () => {
            container.register<TestService>(TestServiceImplementation, {
                lifecycle: "scoped",
                token: TestService,
            });
            const instance1 = container.get<TestService>(TestService);
            const instance2 = container.get<TestService>(TestService);

            expect(instance1).toBeInstanceOf(TestServiceImplementation);
            expect(instance2).toBeInstanceOf(TestServiceImplementation);
            expect(instance1).toBe(instance2); // Same instance in same scope

            const newScope = container.createScope();
            const instance3 = newScope.get<TestService>(TestService);
            expect(instance3).toBeInstanceOf(TestServiceImplementation);
            expect(instance3).not.toBe(instance1); // Different instance in different scope
        });
    });

    describe("named services", () => {
        const Logger = Symbol("Logger");
        interface Logger {
            log(message?: string): void;
        }

        class ConsoleLoggerImplementation implements Logger {
            log(message: string): void {
                console.log(message);
            }
        }

        class FileLoggerImplementation implements Logger {
            log(): void {
                // Simulate file logging
            }
        }

        it("should register and resolve named services", () => {
            container.register<Logger>(ConsoleLoggerImplementation, {
                lifecycle: "singleton",
                token: "console",
            });
            container.register<Logger>(FileLoggerImplementation, {
                lifecycle: "singleton",
                token: "file",
            });

            const consoleLogger = container.get<Logger>("console");
            const fileLogger = container.get<Logger>("file");

            expect(consoleLogger).toBeInstanceOf(ConsoleLoggerImplementation);
            expect(fileLogger).toBeInstanceOf(FileLoggerImplementation);
            expect(consoleLogger).not.toBe(fileLogger);
        });
    });

    describe("dependency injection", () => {
        const Database = Symbol("Database");
        interface Database {
            query(): string;
        }

        const UserService = Symbol("UserService");
        interface UserService {
            getUsers(): string[];
        }

        class DatabaseImplementation implements Database {
            query(): string {
                return "data";
            }
        }

        class UserServiceImplementation implements UserService {
            constructor(@Inject(Database) private readonly db: Database) {}

            getUsers(): string[] {
                return [this.db.query()];
            }
        }

        it("should inject dependencies", () => {
            container.register<Database>(DatabaseImplementation, { token: Database });
            container.register<UserService>(UserServiceImplementation, { token: UserService });

            const userService = container.get<UserService>(UserService);
            expect(userService).toBeInstanceOf(UserServiceImplementation);
            expect(userService.getUsers()).toEqual(["data"]);
        });

        it("should throw error when dependency is not registered", () => {
            container.register<UserService>(UserServiceImplementation, { token: UserService });

            expect(() => container.get<UserService>(UserService)).toThrow();
        });
    });

    describe("concrete class registration", () => {
        const Config = Symbol("Config");
        class ConfigImplementation {
            constructor(public readonly apiKey: string = "test-key") {}
        }

        const ConcreteService = Symbol("ConcreteService");
        class ConcreteServiceImplementation {
            constructor(@Inject(Config) private readonly config: ConfigImplementation) {}
            getApiKey(): string {
                return this.config.apiKey;
            }
        }

        it("should register and resolve concrete classes without tokens", () => {
            container.register(ConfigImplementation, { token: Config, lifecycle: "singleton" });
            container.register(ConcreteServiceImplementation, { token: ConcreteService });

            const service = container.get<ConcreteServiceImplementation>(ConcreteService);
            expect(service).toBeInstanceOf(ConcreteServiceImplementation);
            expect(service.getApiKey()).toBe("test-key");
        });
    });
});
