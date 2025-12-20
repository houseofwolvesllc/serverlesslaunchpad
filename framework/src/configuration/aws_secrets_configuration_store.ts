import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { ConfigurationStore } from "@houseofwolves/serverlesslaunchpad.core/src/configuration";
import { z } from "zod";

export class AwsSecretsConfigurationStore<T extends z.ZodType> implements ConfigurationStore<z.infer<T>> {
    private readonly configurationName: string;
    private readonly client: SecretsManagerClient;
    private readonly zodSchema: T;

    constructor(zodSchema: T, configurationName?: string) {
        this.zodSchema = zodSchema;
        this.configurationName = configurationName ?? "serverlesslaunchpad.com";
        this.client = new SecretsManagerClient({});
    }

    async get(): Promise<z.infer<T>> {
        const command = new GetSecretValueCommand({
            SecretId: `${process.env.NODE_ENV}.${this.configurationName}`,
        });

        const response = await this.client.send(command);
        return this.zodSchema.parse(JSON.parse(response.SecretString ?? "{}"));
    }
}
