import "reflect-metadata";

export type Lifecycle = "transient" | "singleton" | "scoped";

export interface RegistrationOptions {
    lifecycle?: Lifecycle;
    token?: symbol | string;
}

interface InjectableClass {
    __interface: symbol;
}

interface ServiceDescriptor<T> {
    implementation: new (...args: any[]) => T;
    lifecycle: Lifecycle;
    instance?: T;
    token: symbol | string;
    interface: symbol;
}

type ServiceRegistry = Map<symbol | string, ServiceDescriptor<any>>;

// Injectable decorator to mark classes that will be registered as interface implementations
export function Injectable(token: symbol) {
    return function (target: any) {
        (target as InjectableClass).__interface = token;
    };
}

// Inject decorator for constructor parameters that are interfaces
export function Inject(token: symbol) {
    return function (target: any, propertyKey: string | undefined, parameterIndex: number) {
        const existingParams: symbol[] = Reflect.getMetadata("design:paramtypes", target) || [];
        existingParams[parameterIndex] = token;
        Reflect.defineMetadata("design:paramtypes", existingParams, target);
    };
}

// Type guard to check if a class is marked as implementing an interface
function isInjectable(target: any): target is InjectableClass {
    return target && "__interface" in target;
}

export class Container {
    private registry: ServiceRegistry = new Map();
    private scopedInstances: Map<symbol | string, any> = new Map();

    register<T>(implementation: new (...args: any[]) => T, options: RegistrationOptions = {}): void {
        const token = options.token;
        const lifecycle = options.lifecycle || "transient";

        // Check if this token is already registered
        if (token && this.registry.has(token)) {
            throw new Error(`A service with token ${token.toString()} is already registered.`);
        }

        // If the implementation is decorated with @Injectable, use its interface token
        // Otherwise, use the provided token or generate one from the class name
        const interfaceToken = isInjectable(implementation) ? implementation.__interface : undefined;
        const finalToken = token || interfaceToken || Symbol(implementation.name);

        this.registry.set(finalToken, {
            implementation,
            lifecycle,
            instance: lifecycle === "singleton" ? new implementation() : undefined,
            token: finalToken,
            interface: interfaceToken || Symbol(implementation.name),
        });
    }

    private resolveConstructorParams(descriptor: ServiceDescriptor<any>): any[] {
        const paramTypes = Reflect.getMetadata("design:paramtypes", descriptor.implementation) || [];
        return paramTypes.map((paramType: any, index: number) => {
            const paramToken = Reflect.getMetadata("design:paramtypes", descriptor.implementation)[index];
            if (paramToken) {
                const paramDescriptor = this.registry.get(paramToken);
                if (!paramDescriptor) {
                    throw new Error(`No registration found for constructor parameter token: ${paramToken.toString()}`);
                }
                return this.resolveInstance(paramDescriptor);
            }
            return new paramType();
        });
    }

    private resolveInstance(descriptor: ServiceDescriptor<any>): any {
        switch (descriptor.lifecycle) {
            case "singleton":
                if (!descriptor.instance) {
                    const params = this.resolveConstructorParams(descriptor);
                    descriptor.instance = new descriptor.implementation(...params);
                }
                return descriptor.instance;

            case "scoped":
                if (!this.scopedInstances.has(descriptor.token)) {
                    const params = this.resolveConstructorParams(descriptor);
                    this.scopedInstances.set(descriptor.token, new descriptor.implementation(...params));
                }
                return this.scopedInstances.get(descriptor.token);

            case "transient":
            default:
                const params = this.resolveConstructorParams(descriptor);
                return new descriptor.implementation(...params);
        }
    }

    get<T>(token?: symbol | string): T {
        // If no token provided, try to find a service by type
        if (!token) {
            // Look for a service that implements the interface
            for (const [_, descriptor] of this.registry) {
                if (isInjectable(descriptor.implementation)) {
                    return this.get<T>(descriptor.token);
                }
            }
            throw new Error("No service found for the requested type");
        }

        const descriptor = this.registry.get(token);

        if (!descriptor) {
            throw new Error(`No registration found for token: ${token.toString()}`);
        }

        return this.resolveInstance(descriptor) as T;
    }

    createScope(): Container {
        const scopedContainer = new Container();
        scopedContainer.registry = this.registry;
        return scopedContainer;
    }

    clearScope(): void {
        this.scopedInstances.clear();
    }
}
