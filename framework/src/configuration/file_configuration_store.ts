import { ConfigurationStore, Injectable, ConfigurationOptions } from "@houseofwolves/serverlesslaunchpad.core";
import { readFile } from "fs/promises";
import path from "path";
import { z } from "zod";

@Injectable()
export class FileConfigurationStore<T extends z.ZodType> implements ConfigurationStore<z.infer<T>> {
    private readonly filePath: string;
    private readonly zodSchema: T;

    constructor(zodSchema: T, configPath: string, configurationName?: string) {
        const fileName = configurationName ?? "serverlesslaunchpad.com.config.json";
        this.filePath = path.join(configPath, fileName);
        this.zodSchema = zodSchema;
    }

    async get(_options?: ConfigurationOptions): Promise<z.infer<T>> {
        const fileContent = await readFile(this.filePath, "utf-8");
        const data = JSON.parse(fileContent);

        // Direct parse - will throw ZodError if invalid
        // With role-based stores, we expect complete, valid configuration
        console.info(`[FileConfigurationStore] Loading configuration from ${this.filePath}`);
        const config = this.zodSchema.parse(data);
        console.info(`[FileConfigurationStore] Configuration loaded and validated successfully`);

        return config;
    }
}
