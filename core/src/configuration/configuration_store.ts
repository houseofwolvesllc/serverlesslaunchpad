export abstract class ConfigurationStore<T> {
    abstract get(): Promise<T>;
}
