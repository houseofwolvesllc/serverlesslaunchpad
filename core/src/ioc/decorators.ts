import "reflect-metadata";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Constructor<T = object> = new (...args: any[]) => T;

export function Injectable(): <T extends Constructor>(target: T) => T {
    return function <T extends Constructor>(target: T): T {
        // The why... enable metadata emission requires a decorator to be applied to the class
        Reflect.defineMetadata("injectable", true, target);
        return target;
    };
}

export function Inject(name: string): ParameterDecorator {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return function (target: any, _propertyKey: string | symbol | undefined, parameterIndex: number): void {
        const existingKeys: string[] = Reflect.getMetadata("injection:keys", target) || [];
        existingKeys[parameterIndex] = name;
        Reflect.defineMetadata("injection:keys", existingKeys, target);
    };
}
