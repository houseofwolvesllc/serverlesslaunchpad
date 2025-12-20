export enum Environment {
    Moto = "moto",
    Local = "local",
    Development = "development",
    Staging = "staging",
    Production = "production",
}

export interface ConfigurationOptions {
    refresh?: boolean;  // Force cache bypass
}

export abstract class ConfigurationStore<T> {
    abstract get(options?: ConfigurationOptions): Promise<T>;
}
