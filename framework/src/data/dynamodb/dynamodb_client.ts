import {
    DynamoDBClient,
    DynamoDBClientConfig as AwsDynamoDBClientConfig,
} from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient,
    GetCommand,
    PutCommand,
    UpdateCommand,
    DeleteCommand,
    QueryCommand,
    BatchWriteCommand,
    QueryCommandInput,
    QueryCommandOutput,
} from "@aws-sdk/lib-dynamodb";

export interface DynamoDbClientConfig {
    region: string;
    endpoint?: string;
    credentials?: {
        accessKeyId: string;
        secretAccessKey: string;
    };
}

/**
 * Wrapper client for DynamoDB operations using Document Client
 * Provides simplified interface for common CRUD and query operations
 */
export class DynamoDbClient {
    protected readonly client: DynamoDBClient;
    protected readonly docClient: DynamoDBDocumentClient;
    protected readonly tablePrefix: string;

    constructor(config: DynamoDbClientConfig, tablePrefix: string) {
        const clientConfig: AwsDynamoDBClientConfig = {
            region: config.region,
        };

        if (config.endpoint) {
            clientConfig.endpoint = config.endpoint;
        }

        if (config.credentials) {
            clientConfig.credentials = config.credentials;
        }

        this.client = new DynamoDBClient(clientConfig);
        this.docClient = DynamoDBDocumentClient.from(this.client);
        this.tablePrefix = tablePrefix;
    }

    /**
     * Get full table name with environment prefix
     */
    getTableName(tableName: string): string {
        return `${this.tablePrefix}_${tableName}`;
    }

    /**
     * Get a single item by primary key
     */
    async getItem<T>(tableName: string, key: Record<string, any>): Promise<T | undefined> {
        const command = new GetCommand({
            TableName: this.getTableName(tableName),
            Key: key,
        });

        const response = await this.docClient.send(command);
        return response.Item as T | undefined;
    }

    /**
     * Put (create or replace) an item
     */
    async putItem<T>(tableName: string, item: T): Promise<void> {
        const command = new PutCommand({
            TableName: this.getTableName(tableName),
            Item: item as Record<string, any>,
        });

        await this.docClient.send(command);
    }

    /**
     * Update specific attributes of an item
     */
    async updateItem(
        tableName: string,
        key: Record<string, any>,
        updates: Record<string, any>
    ): Promise<void> {
        const updateExpressionParts: string[] = [];
        const expressionAttributeNames: Record<string, string> = {};
        const expressionAttributeValues: Record<string, any> = {};

        Object.keys(updates).forEach((attr, index) => {
            const namePlaceholder = `#attr${index}`;
            const valuePlaceholder = `:val${index}`;
            updateExpressionParts.push(`${namePlaceholder} = ${valuePlaceholder}`);
            expressionAttributeNames[namePlaceholder] = attr;
            expressionAttributeValues[valuePlaceholder] = updates[attr];
        });

        const command = new UpdateCommand({
            TableName: this.getTableName(tableName),
            Key: key,
            UpdateExpression: `SET ${updateExpressionParts.join(", ")}`,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
        });

        await this.docClient.send(command);
    }

    /**
     * Delete an item by primary key
     */
    async deleteItem(tableName: string, key: Record<string, any>): Promise<void> {
        const command = new DeleteCommand({
            TableName: this.getTableName(tableName),
            Key: key,
        });

        await this.docClient.send(command);
    }

    /**
     * Query items with optional pagination
     */
    async query<T>(params: Omit<QueryCommandInput, "TableName"> & { TableName: string }): Promise<{
        items: T[];
        lastEvaluatedKey?: Record<string, any>;
    }> {
        const command = new QueryCommand({
            ...params,
            TableName: this.getTableName(params.TableName),
        });

        const response: QueryCommandOutput = await this.docClient.send(command);

        return {
            items: (response.Items || []) as T[],
            lastEvaluatedKey: response.LastEvaluatedKey,
        };
    }

    /**
     * Batch write items (put or delete)
     */
    async batchWriteItems(tableName: string, deleteKeys: Record<string, any>[]): Promise<void> {
        if (deleteKeys.length === 0) {
            return;
        }

        // DynamoDB BatchWrite has a limit of 25 items per request
        const batches: Record<string, any>[][] = [];
        for (let i = 0; i < deleteKeys.length; i += 25) {
            batches.push(deleteKeys.slice(i, i + 25));
        }

        for (const batch of batches) {
            const command = new BatchWriteCommand({
                RequestItems: {
                    [this.getTableName(tableName)]: batch.map((key: Record<string, any>) => ({
                        DeleteRequest: { Key: key },
                    })),
                },
            });

            await this.docClient.send(command);
        }
    }

    /**
     * Format a Date as ISO 8601 string for storage
     */
    formatTimestamp(date: Date): string {
        return date.toISOString();
    }

    /**
     * Parse ISO 8601 string back to Date
     */
    parseTimestamp(iso: string): Date {
        return new Date(iso);
    }

    /**
     * Convert Date to Unix timestamp (seconds) for DynamoDB TTL
     */
    toTTL(date: Date): number {
        return Math.floor(date.getTime() / 1000);
    }
}
