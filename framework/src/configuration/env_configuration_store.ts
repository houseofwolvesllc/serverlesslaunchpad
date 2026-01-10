import { ConfigurationStore, ConfigurationOptions } from "@houseofwolves/serverlesslaunchpad.core/src/configuration";
import { Injectable } from "@houseofwolves/serverlesslaunchpad.core";
import { z } from "zod";

@Injectable()
export class EnvConfigurationStore<T extends z.ZodType> implements ConfigurationStore<z.infer<T>> {
    private readonly configurationName: string;
    private readonly zodSchema: T;

    /**
     * Create an environment variable configuration store.
     * @param zodSchema - Zod schema for configuration validation
     * @param configurationName - Environment variable name to read configuration from
     */
    constructor(zodSchema: T, configurationName: string) {
        this.configurationName = configurationName;
        this.zodSchema = zodSchema;
    }

    async get(_options?: ConfigurationOptions): Promise<z.infer<T>> {
        const configuration = process.env[this.configurationName] ?? "";
        const data = JSON.parse(configuration);

        console.info(`[EnvConfigurationStore] Loading configuration from environment variable ${this.configurationName}`);
        const config = this.zodSchema.parse(data);
        console.info(`[EnvConfigurationStore] Configuration loaded and validated successfully`);

        return config;
    }
}
