import { Environment, Injectable } from "@houseofwolves/serverlesslaunchpad.core";
import { InfrastructureConfigurationStore } from "../../configuration";
import { DynamoDbClient, DynamoDbClientConfig } from "./dynamodb_client";

/**
 * Factory for creating and managing DynamoDB client instances.
 * Handles lazy initialization, race condition prevention, and environment-specific configuration.
 *
 * This factory is injectable and maintains a single DynamoDbClient instance per factory instance.
 * The client is created lazily on the first call to getClient() and reused for subsequent calls.
 */
@Injectable()
export class DynamoDbClientFactory {
    private readonly configStore: InfrastructureConfigurationStore;
    private dynamoDbClient: DynamoDbClient | undefined;
    private clientPromise: Promise<DynamoDbClient> | undefined;

    constructor(configStore: InfrastructureConfigurationStore) {
        this.configStore = configStore;
    }

    /**
     * Get or create the DynamoDB client.
     * Thread-safe: concurrent calls will wait for the same client creation promise.
     *
     * @returns Promise resolving to the singleton DynamoDbClient instance
     * @throws Error if client creation fails
     */
    async getClient(): Promise<DynamoDbClient> {
        // Return existing client if already initialized
        if (this.dynamoDbClient) {
            return this.dynamoDbClient;
        }

        // Return existing promise if client creation is in progress
        if (this.clientPromise) {
            return this.clientPromise;
        }

        // Start client creation
        this.clientPromise = this.createClient();
        return this.clientPromise;
    }

    /**
     * Internal method to create a new DynamoDB client.
     * Handles configuration loading and environment-specific setup.
     */
    private async createClient(): Promise<DynamoDbClient> {
        try {
            const config = await this.configStore.get();
            const environment = process.env.NODE_ENV as Environment;

            const dynamoDbConfig: DynamoDbClientConfig = {
                region: config.aws.region,
                endpoint: environment === "local" ? config.aws.endpoint_url : undefined,
                credentials:
                    environment === "local" ? { accessKeyId: "testing", secretAccessKey: "testing" } : undefined,
            };

            const tablePrefix = `slp_${environment}`;
            this.dynamoDbClient = new DynamoDbClient(dynamoDbConfig, tablePrefix);
            return this.dynamoDbClient;
        } catch (error) {
            console.error("Failed to create DynamoDB client:", error);
            throw new Error("DynamoDbClientFactory: Unable to initialize DynamoDB client");
        }
    }
}
