import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { Injectable } from "@houseofwolves/serverlesslaunchpad.core";
import { ConfigurationStore, Environment } from "@houseofwolves/serverlesslaunchpad.core/src/configuration";
import { z } from "zod";

@Injectable()
export class AwsSecretsConfigurationStore<T extends z.ZodType> implements ConfigurationStore<z.infer<T>> {
    private readonly configurationName: string;
    private readonly client: SecretsManagerClient;
    private readonly zodSchema: T;
    private readonly environment: Environment;

    constructor(zodSchema: T, environment: Environment, awsConfig?: any, configurationName?: string) {
        this.zodSchema = zodSchema;
        this.environment = environment;
        this.configurationName = configurationName ?? "serverlesslaunchpad.com";
        this.client = new SecretsManagerClient(awsConfig || {});
    }

    async get(): Promise<z.infer<T>> {
        const command = new GetSecretValueCommand({
            SecretId: `${this.environment}.${this.configurationName}`,
        });

        const response = await this.client.send(command);
        return this.zodSchema.parse(JSON.parse(response.SecretString ?? "{}"));
    }
}
