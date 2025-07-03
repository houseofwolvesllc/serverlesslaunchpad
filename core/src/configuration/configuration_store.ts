export enum Environment {
    Development = "development",
    Staging = "staging",
    Production = "production",
}

export abstract class ConfigurationStore<T> {
    abstract get(): Promise<T>;
}
