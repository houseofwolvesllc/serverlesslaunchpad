import { ContainerError, ServiceAlreadyRegisteredError, ServiceNotFoundError } from "./errors";
import { AbstractConstructor, BindOptions, Constructor, ServiceDescriptor } from "./types";

export class ContainerRegistrar<T> {
    constructor(private descriptor: ServiceDescriptor<T>, private registry: Map<string, ServiceDescriptor<any>>) {}

    to(implementationType: Constructor<T>): ContainerRegistrar<T> {
        this.descriptor.implementation = implementationType;
        return this;
    }

    toSelf(): ContainerRegistrar<T> {
        this.descriptor.implementation = this.descriptor.serviceType as Constructor<T>;
        return this;
    }

    toFactory(factory: () => T): ContainerRegistrar<T> {
        this.descriptor.factory = factory;
        return this;
    }

    asSingleton(): ContainerRegistrar<T> {
        this.descriptor.lifecycle = "singleton";
        return this;
    }

    asTransient(): ContainerRegistrar<T> {
        this.descriptor.lifecycle = "transient";
        return this;
    }

    named(name: string): ContainerRegistrar<T> {
        this.registry.delete(this.descriptor.name);
        this.descriptor.name = `${name}-${this.descriptor.serviceType.name}`;

        if (this.registry.has(this.descriptor.name)) {
            throw new ServiceAlreadyRegisteredError(this.descriptor.name);
        }

        this.registry.set(this.descriptor.name, this.descriptor);
        return this;
    }
}

export class Container {
    private registry: Map<string, ServiceDescriptor<any>> = new Map();

    bind<T>(serviceType: AbstractConstructor<T> | Constructor<T>, options?: BindOptions<T>): ContainerRegistrar<T> {
        const descriptor: ServiceDescriptor<T> = {
            serviceType,
            implementation: options?.implementation || (serviceType as Constructor<T>),
            factory: options?.factory,
            lifecycle: options?.lifecycle || "transient",
            name: options?.name ? `${options.name}-${serviceType.name}` : serviceType.name,
        };

        if (this.registry.has(descriptor.name)) {
            throw new ServiceAlreadyRegisteredError(descriptor.name);
        }

        this.registry.set(descriptor.name, descriptor);
        return new ContainerRegistrar(descriptor, this.registry);
    }

    resolve<T>(serviceType: AbstractConstructor<T> | Constructor<T>, name?: string): T {
        const registryName = name ? `${name}-${serviceType.name}` : serviceType.name;
        let descriptor = this.registry.get(registryName);

        if (!descriptor) {
            if (name) {
                throw new ServiceNotFoundError(registryName);
            }

            descriptor = {
                serviceType,
                implementation: serviceType as Constructor<T>,
                lifecycle: "transient",
                name: registryName,
            };
        }

        if (descriptor.factory) {
            switch (descriptor.lifecycle) {
                case "singleton":
                    if (!descriptor.instance) {
                        descriptor.instance = descriptor.factory();
                    }
                    return descriptor.instance;
                case "transient":
                    return descriptor.factory();
                default:
                    throw new ContainerError(`Invalid lifecycle ${descriptor.lifecycle}`);
            }
        }

        const params = Reflect.getMetadata("design:paramtypes", descriptor.implementation);
        const keys = Reflect.getMetadata("injection:keys", descriptor.implementation);
        const resolvedParams = !params
            ? []
            : params.map((param: any, index: number) => {
                  if (!param) {
                      throw new ContainerError(
                          `Cannot resolve parameter of type ${param} for ${descriptor.implementation.name}`
                      );
                  }

                  const key = keys?.[index];
                  return this.resolve(param, key);
              });

        switch (descriptor.lifecycle) {
            case "singleton":
                if (!descriptor.instance) {
                    descriptor.instance = new descriptor.implementation(...resolvedParams);
                }
                return descriptor.instance;
            case "transient":
                return new descriptor.implementation(...resolvedParams);
            default:
                throw new ContainerError(`Invalid lifecycle ${descriptor.lifecycle}`);
        }
    }
}
