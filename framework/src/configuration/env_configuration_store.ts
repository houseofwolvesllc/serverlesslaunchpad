import { ConfigurationStore } from "@houseofwolves/serverlesslaunchpad.core/src/configuration";
import { Injectable } from "@houseofwolves/serverlesslaunchpad.core";
import { z } from "zod";

@Injectable()
export class EnvConfigurationStore<T extends z.ZodType> implements ConfigurationStore<z.infer<T>> {
    private readonly configurationName: string;
    private readonly zodSchema: T;

    constructor(zodSchema: T, configurationName?: string) {
        this.configurationName = configurationName ?? "serverlesslaunchpad.com";
        this.zodSchema = zodSchema;
    }

    async get(): Promise<z.infer<T>> {
        const configuration = process.env[this.configurationName] ?? "";
        return this.zodSchema.parse(JSON.parse(configuration));
    }
}
