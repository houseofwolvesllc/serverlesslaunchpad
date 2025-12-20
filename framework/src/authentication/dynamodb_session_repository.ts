import { Paginated, PagingInstruction } from "@houseofwolves/serverlesslaunchpad.commons";
import {
    DeleteSessionBySignatureMessage,
    DeleteSessionsMessage,
    GetSessionByIdMessage,
    GetSessionBySignatureMessage,
    GetSessionsMessage,
    Injectable,
    Session,
    SessionRepository,
    User,
    VerifySessionMessage,
    VerifySessionResult,
} from "@houseofwolves/serverlesslaunchpad.core";
import { ulid } from "ulid";
import { DynamoDbClient } from "../data/dynamodb/dynamodb_client";
import { DynamoDbClientFactory } from "../data/dynamodb/dynamodb_client_factory";
import { DdbPagingInstruction } from "../data/dynamodb/ddb_paging_instruction";

@Injectable()
export class DynamoDbSessionRepository extends SessionRepository {
    private readonly clientFactory: DynamoDbClientFactory;
    protected readonly tableName = "sessions";
    protected readonly usersTableName = "users";

    constructor(clientFactory: DynamoDbClientFactory) {
        super();
        this.clientFactory = clientFactory;
    }

    /**
     * Map DynamoDB item to Session domain object
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected mapToSession(item: Record<string, any>, client: DynamoDbClient): Session {
        return {
            sessionId: item.sessionId,
            userId: item.userId,
            ipAddress: item.ipAddress,
            userAgent: item.userAgent,
            dateCreated: client.parseTimestamp(item.dateCreated),
            dateLastAccessed: client.parseTimestamp(item.dateLastAccessed),
            dateExpires: client.parseTimestamp(item.dateExpires),
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
     * Get session by sessionId and userId (composite primary key)
     */
    async getSessionById(message: GetSessionByIdMessage): Promise<Session | undefined> {
        const client = await this.clientFactory.getClient();
        const item = await client.getItem(this.tableName, {
            userId: message.userId,
            sessionId: message.sessionId,
        });

        return item ? this.mapToSession(item, client) : undefined;
    }

    /**
     * Get session by sessionSignature (via sessionSignature-index GSI)
     */
    async getSessionBySignature(message: GetSessionBySignatureMessage): Promise<Session | undefined> {
        const client = await this.clientFactory.getClient();
        const result = await client.query<Record<string, any>>({
            TableName: this.tableName,
            IndexName: "sessionSignature-index",
            KeyConditionExpression: "sessionSignature = :sig",
            ExpressionAttributeValues: {
                ":sig": message.sessionSignature,
            },
        });

        return result.items.length > 0 ? this.mapToSession(result.items[0], client) : undefined;
    }

    /**
     * Get all sessions for a user with pagination
     * Sessions are sorted newest-first due to ULID sort keys
     */
    async getSessions(message: GetSessionsMessage): Promise<Paginated<Session>> {
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

        const sessions = result.items.map((item) => this.mapToSession(item, client));
        const hasMore = !!result.lastEvaluatedKey;

        // Construct next instruction
        let next: DdbPagingInstruction | undefined;
        if (hasMore && sessions.length > 0 && message.pagingInstruction) {
            next = {
                lastEvaluatedKey: result.lastEvaluatedKey,
                limit: message.pagingInstruction.limit,
                scanIndexForward: false,
            };
        }

        // Previous pagination is complex in DynamoDB - simplified to forward-only
        const previous: DdbPagingInstruction | undefined = undefined;

        // Return Paginated<Session>
        return {
            items: sessions,
            pagingInstructions: {
                current: message.pagingInstruction,
                next: next,
                previous: previous,
            },
        };
    }

    /**
     * Create a new session with ULID for sessionId
     */
    async createSession(message: {
        sessionId: string;
        userId: string;
        sessionSignature: string;
        ipAddress: string;
        userAgent: string;
    }): Promise<Session> {
        const client = await this.clientFactory.getClient();
        const dateCreated = new Date();
        const dateExpires = new Date(dateCreated.getTime() + 1000 * 60 * 60 * 24 * 7); // 7 days

        const sessionId = ulid(); // Generate time-ordered ULID

        const item = {
            sessionId: sessionId,
            userId: message.userId,
            sessionSignature: message.sessionSignature,
            ipAddress: message.ipAddress,
            userAgent: message.userAgent,
            dateCreated: client.formatTimestamp(dateCreated),
            dateLastAccessed: client.formatTimestamp(dateCreated),
            dateExpires: client.formatTimestamp(dateExpires),
            ttl: client.toTTL(dateExpires), // DynamoDB TTL
        };

        await client.putItem(this.tableName, item);

        return this.mapToSession(item, client);
    }

    /**
     * Verify session and return session + user data
     * Updates dateLastAccessed and dateExpires
     */
    async verifySession(message: VerifySessionMessage): Promise<VerifySessionResult | undefined> {
        const client = await this.clientFactory.getClient();

        // 1. Query session by signature
        const sessionResult = await client.query<Record<string, any>>({
            TableName: this.tableName,
            IndexName: "sessionSignature-index",
            KeyConditionExpression: "sessionSignature = :sig",
            ExpressionAttributeValues: {
                ":sig": message.sessionSignature,
            },
        });

        if (sessionResult.items.length === 0) {
            return undefined;
        }

        const sessionItem = sessionResult.items[0] as Record<string, any>;

        // 2. Get user
        const userItem = await client.getItem(this.usersTableName, {
            userId: sessionItem.userId,
        });

        if (!userItem) {
            return undefined;
        }

        // 3. Update session timestamps
        const dateLastAccessed = new Date();
        const dateExpires = new Date(dateLastAccessed.getTime() + 1000 * 60 * 60 * 24 * 7); // 7 days

        await client.updateItem(
            this.tableName,
            {
                userId: sessionItem.userId,
                sessionId: sessionItem.sessionId,
            },
            {
                dateLastAccessed: client.formatTimestamp(dateLastAccessed),
                dateExpires: client.formatTimestamp(dateExpires),
                ttl: client.toTTL(dateExpires),
            }
        );

        // Update local item with new timestamps for return value
        sessionItem.dateLastAccessed = client.formatTimestamp(dateLastAccessed);
        sessionItem.dateExpires = client.formatTimestamp(dateExpires);

        // 4. Return session + user
        return {
            session: this.mapToSession(sessionItem, client),
            user: this.mapToUser(userItem, client),
        };
    }

    /**
     * Delete session by signature
     */
    async deleteSessionBySignature(message: DeleteSessionBySignatureMessage): Promise<boolean> {
        const client = await this.clientFactory.getClient();

        // First, find the session by signature to get sessionId
        const sessionResult = await client.query<Record<string, any>>({
            TableName: this.tableName,
            IndexName: "sessionSignature-index",
            KeyConditionExpression: "sessionSignature = :sig",
            ExpressionAttributeValues: {
                ":sig": message.sessionSignature,
            },
        });

        if (sessionResult.items.length === 0) {
            return false;
        }

        const sessionItem = sessionResult.items[0] as Record<string, any>;

        try {
            await client.deleteItem(this.tableName, {
                userId: sessionItem.userId,
                sessionId: sessionItem.sessionId,
            });
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Batch delete sessions by sessionIds
     */
    async deleteSessions(message: DeleteSessionsMessage): Promise<boolean> {
        const client = await this.clientFactory.getClient();

        try {
            const deleteKeys = message.sessionIds.map((sessionId) => ({
                userId: message.userId,
                sessionId: sessionId,
            }));

            await client.batchWriteItems(this.tableName, deleteKeys);
            return true;
        } catch (error) {
            return false;
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

        // lastEvaluatedKey can be undefined (first page) or an object (subsequent pages)
        // but NOT null (typeof null === "object" but it's not valid)
        return (
            ddbInstruction.lastEvaluatedKey === undefined ||
            (typeof ddbInstruction.lastEvaluatedKey === "object" && ddbInstruction.lastEvaluatedKey !== null)
        );
    }
}
