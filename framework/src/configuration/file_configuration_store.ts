import { ConfigurationStore, Injectable } from "@houseofwolves/serverlesslaunchpad.core";
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

    async get(): Promise<z.infer<T>> {
        const fileContent = await readFile(this.filePath, "utf-8");
        return this.zodSchema.parse(JSON.parse(fileContent));
    }
}
