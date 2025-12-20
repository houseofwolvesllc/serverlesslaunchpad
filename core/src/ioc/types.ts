export type Lifecycle = "transient" | "singleton";

export type BindOptions<T> = {
    implementation?: Constructor<T>;
    factory?: () => T;
    name?: string;
    lifecycle?: Lifecycle;
};

export interface ServiceDescriptor<T> {
    serviceType: AbstractConstructor<T> | Constructor<T>;
    implementation: Constructor<T>;
    lifecycle: Lifecycle;
    instance?: T;
    name: string;
    factory?: () => T;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AbstractConstructor<T> = abstract new (...args: any[]) => T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Constructor<T> = new (...args: any[]) => T;
