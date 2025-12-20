import { Paginated, PagingInstruction } from "@houseofwolves/serverlesslaunchpad.types";
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
import { DdbPagingInstruction } from "../data/dynamodb/ddb_paging_instruction";
import { DynamoDbClient } from "../data/dynamodb/dynamodb_client";
import { DynamoDbClientFactory } from "../data/dynamodb/dynamodb_client_factory";

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
     * Note: Database column is 'description' but mapped to 'label' for backward compatibility
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected mapToApiKey(item: Record<string, any>, client: DynamoDbClient): ApiKey {
        return {
            apiKeyId: item.apiKeyId,
            userId: item.userId,
            apiKey: item.apiKey,
            label: item.description, // Map database 'description' to domain 'label'
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
        const limit = message.pagingInstruction?.limit ?? 100;

        // Validate paging instruction type
        if (message.pagingInstruction && !this.isDdbPagingInstruction(message.pagingInstruction)) {
            throw new Error("Paging instruction must be a DdbPagingInstruction");
        }

        // Query DynamoDB with pagination
        // Treat both undefined and null as "no cursor" (start from beginning)
        const exclusiveStartKey = message.pagingInstruction?.lastEvaluatedKey;
        const result = await client.query<Record<string, any>>({
            TableName: this.tableName,
            KeyConditionExpression: "userId = :userId",
            ExpressionAttributeValues: {
                ":userId": message.userId,
            },
            ScanIndexForward: false, // Newest first (ULID descending)
            Limit: limit,
            ExclusiveStartKey: exclusiveStartKey ?? undefined, // Convert null to undefined for DynamoDB
        });

        const apiKeys = result.items.map((item) => this.mapToApiKey(item, client));

        // Construct current instruction (echo what was sent)
        const current: DdbPagingInstruction | undefined = message.pagingInstruction;

        // Construct previous instruction
        // Can go back if we're not on page 1 (have a cursor)
        let previous: DdbPagingInstruction | undefined;
        const currentCursor = message.pagingInstruction?.lastEvaluatedKey;

        if (currentCursor !== undefined && currentCursor !== null) {
            // We're on page 2+, can go back
            // previousLastEvaluatedKey tells us where the previous page is
            const prevCursor = message.pagingInstruction?.previousLastEvaluatedKey;

            previous = {
                limit: limit,
                lastEvaluatedKey: prevCursor ?? null,
                previousLastEvaluatedKey: null, // Always set to null for consistency with JSON serialization
                scanIndexForward: false,
            };
        }

        // Construct next instruction
        let next: DdbPagingInstruction | undefined;
        if (result.lastEvaluatedKey && apiKeys.length > 0) {
            next = {
                limit: limit,
                lastEvaluatedKey: result.lastEvaluatedKey,
                previousLastEvaluatedKey: currentCursor ?? null, // Current cursor becomes previous for next page
                scanIndexForward: false,
            };
        }

        // Return Paginated<ApiKey>
        return {
            items: apiKeys,
            pagingInstructions: {
                previous: previous,
                current: current,
                next: next,
            },
        };
    }

    /**
     * Create a new API key with ULID for apiKeyId
     * Note: Maps 'label' to database 'description' column for backward compatibility
     */
    async createApiKey(message: CreateApiKeyMessage): Promise<ApiKey> {
        const client = await this.clientFactory.getClient();
        const dateCreated = new Date();
        const apiKeyId = ulid(); // Generate time-ordered ULID

        const item: Record<string, any> = {
            apiKeyId: apiKeyId,
            userId: message.userId,
            apiKey: message.apiKey,
            description: message.label, // Map domain 'label' to database 'description'
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
     * Batch delete API keys by ID
     */
    async deleteApiKeys(message: DeleteApiKeysMessage): Promise<void> {
        const client = await this.clientFactory.getClient();

        // Build delete keys from apiKeyIds (we now have IDs directly)
        const deleteKeys = message.apiKeyIds.map((apiKeyId) => ({
            userId: message.userId,
            apiKeyId: apiKeyId,
        }));

        if (deleteKeys.length > 0) {
            await client.batchWriteItems(this.tableName, deleteKeys);
        }
    }

    /**
     * Type guard to check if paging instruction is DdbPagingInstruction
     */
    private isDdbPagingInstruction(
        pagingInstruction: PagingInstruction | undefined
    ): pagingInstruction is DdbPagingInstruction {
        if (pagingInstruction === undefined) {
            return false;
        }

        const ddbInstruction = pagingInstruction as DdbPagingInstruction;

        // lastEvaluatedKey can be:
        // - undefined (not provided)
        // - null (page 1, survives JSON serialization)
        // - object (page 2+, DynamoDB cursor)
        return (
            ddbInstruction.lastEvaluatedKey === undefined ||
            ddbInstruction.lastEvaluatedKey === null ||
            (typeof ddbInstruction.lastEvaluatedKey === "object" && ddbInstruction.lastEvaluatedKey !== null)
        );
    }
}
