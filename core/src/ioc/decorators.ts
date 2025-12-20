import "reflect-metadata";

export function Injectable() {
    return function <T extends { new (...args: any[]): any }>(target: T) {
        // The why... enable metadata emission requires a decorator to be applied to the class
        Reflect.defineMetadata("injectable", true, target);
        return target;
    };
}

export function Inject(name: string) {
    return function (target: any, _propertyKey: string | undefined, parameterIndex: number) {
        const existingKeys: string[] = Reflect.getMetadata("injection:keys", target) || [];
        existingKeys[parameterIndex] = name;
        Reflect.defineMetadata("injection:keys", existingKeys, target);
    };
}
