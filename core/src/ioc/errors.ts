export class ContainerError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ContainerError";
    }
}

export class CircularDependencyError extends ContainerError {
    constructor(dependencyChain: string[]) {
        super(`Circular dependency detected: ${dependencyChain.join(" -> ")}`);
        this.name = "CircularDependencyError";
    }
}

export class ServiceNotFoundError extends ContainerError {
    constructor(serviceName: string) {
        super(`Service ${serviceName} not found`);
        this.name = "ServiceNotFoundError";
    }
}

export class ServiceAlreadyRegisteredError extends ContainerError {
    constructor(serviceName: string) {
        super(`Service ${serviceName} already registered`);
        this.name = "ServiceAlreadyRegisteredError";
    }
}
