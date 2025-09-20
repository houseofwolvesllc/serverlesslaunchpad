import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { mockClient } from "aws-sdk-client-mock";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { Environment } from "@houseofwolves/serverlesslaunchpad.core/src/configuration";
import { AwsSecretsConfigurationStore } from "../../src/configuration/aws_secrets_configuration_store";

describe("AwsSecretsConfigurationStore", () => {
    const mockConfigSchema = z.object({
        AWS_S3_BUCKET: z.string(),
        SSK: z.string(),
    });

    it("should return the secret value", async () => {
        const mockSecretValue = {
            SecretString: JSON.stringify({
                AWS_S3_BUCKET: "test-bucket",
                SSK: "test-ssk",
            }),
        };

        const mockSecretsManagerClient = mockClient(SecretsManagerClient);
        mockSecretsManagerClient.on(GetSecretValueCommand).resolves(mockSecretValue);

        const store = new AwsSecretsConfigurationStore(mockConfigSchema, Environment.Development);
        const result = await store.get();

        expect(result.AWS_S3_BUCKET).toEqual("test-bucket");
        expect(result.SSK).toEqual("test-ssk");
    });

    it("Should throw an error when the secret does not match expected schema", async () => {
        const mockSecretValue = {
            SecretString: JSON.stringify({
                AWS_S3_BUCKET: "test-bucket",
            }),
        };

        const mockSecretsManagerClient = mockClient(SecretsManagerClient);
        mockSecretsManagerClient.on(GetSecretValueCommand).resolves(mockSecretValue);

        const store = new AwsSecretsConfigurationStore(mockConfigSchema, Environment.Development);
        await expect(store.get()).rejects.toThrow();
    });
});
