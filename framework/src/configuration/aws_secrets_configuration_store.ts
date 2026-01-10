import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { Injectable } from "@houseofwolves/serverlesslaunchpad.core";
import { ConfigurationStore, Environment, ConfigurationOptions } from "@houseofwolves/serverlesslaunchpad.core";
import { z } from "zod";

@Injectable()
export class AwsSecretsConfigurationStore<T extends z.ZodType> implements ConfigurationStore<z.infer<T>> {
    private readonly configurationName: string;
    private readonly client: SecretsManagerClient;
    private readonly zodSchema: T;
    private readonly environment: Environment;

    /**
     * Create an AWS Secrets Manager configuration store.
     * @param zodSchema - Zod schema for configuration validation
     * @param environment - Environment to load secrets for
     * @param configurationName - Configuration domain name (e.g., "serverlesslaunchpad.com")
     * @param awsConfig - Optional AWS SDK client configuration
     */
    constructor(zodSchema: T, environment: Environment, configurationName: string, awsConfig?: ConstructorParameters<typeof SecretsManagerClient>[0]) {
        this.zodSchema = zodSchema;
        this.environment = environment;
        this.configurationName = configurationName;
        this.client = new SecretsManagerClient(awsConfig || {});
    }

    async get(_options?: ConfigurationOptions): Promise<z.infer<T>> {
        const command = new GetSecretValueCommand({
            SecretId: `${this.environment}.${this.configurationName}`,
        });

        console.info(`[AwsSecretsConfigurationStore] Loading secrets from ${this.environment}.${this.configurationName}`);
        const response = await this.client.send(command);
        const data = JSON.parse(response.SecretString ?? "{}");

        // Direct parse - will throw ZodError if invalid
        // With role-based stores, we expect complete, valid secrets
        const config = this.zodSchema.parse(data);
        console.info(`[AwsSecretsConfigurationStore] Secrets loaded and validated successfully`);

        return config;
    }
}
