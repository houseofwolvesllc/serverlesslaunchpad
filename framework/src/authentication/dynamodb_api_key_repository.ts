import { Paginated, PagingInstruction } from "@houseofwolves/serverlesslaunchpad.commons";
import {
    ApiKey,
    ApiKeyRepository,
    CreateApiKeyMessage,
    DeleteApiKeysMessage,
    GetApiKeysMessage,
    Injectable,
    User,
    VerifyApiKeyMessage,
    VerifyApiKeyResult,
} from "@houseofwolves/serverlesslaunchpad.core";
import { ulid } from "ulid";
import { DynamoDbClient } from "../data/dynamodb/dynamodb_client";
import { DynamoDbClientFactory } from "../data/dynamodb/dynamodb_client_factory";
import { DdbPagingInstruction } from "../data/dynamodb/ddb_paging_instruction";

@Injectable()
export class DynamoDbApiKeyRepository extends ApiKeyRepository {
    private readonly clientFactory: DynamoDbClientFactory;
    protected readonly tableName = "api_keys";
    protected readonly usersTableName = "users";

    constructor(clientFactory: DynamoDbClientFactory) {
        super();
        this.clientFactory = clientFactory;
    }

    /**
     * Map DynamoDB item to ApiKey domain object
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected mapToApiKey(item: Record<string, any>, client: DynamoDbClient): ApiKey {
        return {
            apiKeyId: item.apiKeyId,
            userId: item.userId,
            apiKey: item.apiKey,
            description: item.description,
            dateCreated: client.parseTimestamp(item.dateCreated),
            dateLastAccessed: client.parseTimestamp(item.dateLastAccessed),
        };
    }

    /**
     * Map DynamoDB item to User domain object
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected mapToUser(item: Record<string, any>, client: DynamoDbClient): User {
        return {
            userId: item.userId,
            email: item.email,
            firstName: item.firstName,
            lastName: item.lastName,
            role: item.role,
            features: item.features,
            dateCreated: client.parseTimestamp(item.dateCreated),
            dateModified: client.parseTimestamp(item.dateModified),
        };
    }

    /**
     * Get all API keys for a user with pagination
     * API keys are sorted newest-first due to ULID sort keys
     */
    async getApiKeys(message: GetApiKeysMessage): Promise<Paginated<ApiKey>> {
        const client = await this.clientFactory.getClient();

        // Validate paging instruction type
        if (message.pagingInstruction && !this.isDdbPagingInstruction(message.pagingInstruction)) {
            throw new Error("Paging instruction must be a DdbPagingInstruction");
        }

        // Query DynamoDB with pagination
        const result = await client.query<Record<string, any>>({
            TableName: this.tableName,
            KeyConditionExpression: "userId = :userId",
            ExpressionAttributeValues: {
                ":userId": message.userId,
            },
            ScanIndexForward: false, // Newest first (ULID descending)
            Limit: message.pagingInstruction?.limit,
            ExclusiveStartKey: message.pagingInstruction?.lastEvaluatedKey,
        });

        const apiKeys = result.items.map((item) => this.mapToApiKey(item, client));
        const hasMore = !!result.lastEvaluatedKey;

        // Construct next instruction
        let next: DdbPagingInstruction | undefined;
        if (hasMore && apiKeys.length > 0 && message.pagingInstruction) {
            next = {
                lastEvaluatedKey: result.lastEvaluatedKey,
                limit: message.pagingInstruction.limit,
                scanIndexForward: false,
            };
        }

        // Previous pagination is complex in DynamoDB - simplified to forward-only
        const previous: DdbPagingInstruction | undefined = undefined;

        // Return Paginated<ApiKey>
        return {
            items: apiKeys,
            pagingInstructions: {
                current: message.pagingInstruction,
                next: next,
                previous: previous,
            },
        };
    }

    /**
     * Create a new API key with ULID for apiKeyId
     */
    async createApiKey(message: CreateApiKeyMessage): Promise<ApiKey> {
        const client = await this.clientFactory.getClient();
        const dateCreated = new Date();
        const apiKeyId = ulid(); // Generate time-ordered ULID

        const item = {
            apiKeyId: apiKeyId,
            userId: message.userId,
            apiKey: message.apiKey,
            description: "API Key",
            dateCreated: client.formatTimestamp(dateCreated),
            dateLastAccessed: client.formatTimestamp(dateCreated),
        };

        await client.putItem(this.tableName, item);

        return this.mapToApiKey(item, client);
    }

    /**
     * Verify API key and return apiKey + user data
     * Updates dateLastAccessed
     */
    async verifyApiKey(message: VerifyApiKeyMessage): Promise<VerifyApiKeyResult | undefined> {
        const client = await this.clientFactory.getClient();

        // 1. Query API key by apiKey (via apiKey-index GSI)
        const apiKeyResult = await client.query<Record<string, any>>({
            TableName: this.tableName,
            IndexName: "apiKey-index",
            KeyConditionExpression: "apiKey = :key",
            ExpressionAttributeValues: {
                ":key": message.apiKey,
            },
        });

        if (apiKeyResult.items.length === 0) {
            return undefined;
        }

        const apiKeyItem = apiKeyResult.items[0] as Record<string, any>;

        // 2. Get user
        const userItem = await client.getItem(this.usersTableName, {
            userId: apiKeyItem.userId,
        });

        if (!userItem) {
            return undefined;
        }

        // 3. Update dateLastAccessed
        const dateLastAccessed = new Date();

        await client.updateItem(
            this.tableName,
            {
                userId: apiKeyItem.userId,
                apiKeyId: apiKeyItem.apiKeyId,
            },
            {
                dateLastAccessed: client.formatTimestamp(dateLastAccessed),
            }
        );

        // Update local item with new timestamp for return value
        apiKeyItem.dateLastAccessed = client.formatTimestamp(dateLastAccessed);

        // 4. Return apiKey + user
        return {
            apiKey: this.mapToApiKey(apiKeyItem, client),
            user: this.mapToUser(userItem, client),
        };
    }

    /**
     * Batch delete API keys
     */
    async deleteApiKeys(message: DeleteApiKeysMessage): Promise<void> {
        const client = await this.clientFactory.getClient();

        const deleteKeys = message.apiKeys.map((apiKey) => {
            // We need to query to get the apiKeyId first since we only have the apiKey value
            // This is a limitation - ideally the message would include apiKeyIds
            // For now, we'll do individual queries
            return client
                .query<Record<string, any>>({
                    TableName: this.tableName,
                    IndexName: "apiKey-index",
                    KeyConditionExpression: "apiKey = :key",
                    ExpressionAttributeValues: {
                        ":key": apiKey,
                    },
                })
                .then((result) => {
                    if (result.items.length > 0) {
                        const item = result.items[0] as Record<string, any>;
                        return {
                            userId: item.userId,
                            apiKeyId: item.apiKeyId,
                        };
                    }
                    return null;
                });
        });

        const resolvedKeys = await Promise.all(deleteKeys);
        const validKeys = resolvedKeys.filter((key) => key !== null) as Record<string, any>[];

        if (validKeys.length > 0) {
            await client.batchWriteItems(this.tableName, validKeys);
        }
    }

    /**
     * Type guard to check if paging instruction is DdbPagingInstruction
     */
    private isDdbPagingInstruction(
        pagingInstruction: PagingInstruction | undefined
    ): pagingInstruction is DdbPagingInstruction {
        return (
            pagingInstruction !== undefined &&
            typeof (pagingInstruction as DdbPagingInstruction).lastEvaluatedKey === "object"
        );
    }
}
