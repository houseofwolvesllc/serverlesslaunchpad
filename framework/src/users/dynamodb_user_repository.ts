import {
    Injectable,
    UserRepository,
    User,
    GetUserByEmailMessage,
    GetUserByIdMessage,
    UpsertUserMessage,
} from "@houseofwolves/serverlesslaunchpad.core";
import { DynamoDbClientFactory } from "../data/dynamodb/dynamodb_client_factory";
import { DynamoDbClient } from "../data/dynamodb/dynamodb_client";

@Injectable()
export class DynamoDbUserRepository extends UserRepository {
    private readonly clientFactory: DynamoDbClientFactory;
    protected readonly tableName = "users";

    constructor(clientFactory: DynamoDbClientFactory) {
        super();
        this.clientFactory = clientFactory;
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
     * Get user by userId (primary key)
     */
    async getUserById(message: GetUserByIdMessage): Promise<User | undefined> {
        const client = await this.clientFactory.getClient();
        const item = await client.getItem(this.tableName, {
            userId: message.userId,
        });

        return item ? this.mapToUser(item, client) : undefined;
    }

    /**
     * Get user by email (via email-index GSI)
     */
    async getUserByEmail(message: GetUserByEmailMessage): Promise<User | undefined> {
        const client = await this.clientFactory.getClient();
        const result = await client.query<Record<string, any>>({
            TableName: this.tableName,
            IndexName: "email-index",
            KeyConditionExpression: "email = :email",
            ExpressionAttributeValues: {
                ":email": message.email,
            },
        });

        return result.items.length > 0 ? this.mapToUser(result.items[0], client) : undefined;
    }

    /**
     * Upsert (create or update) user
     * DynamoDB PutItem replaces the entire item, which is effectively an upsert
     */
    async upsertUser(message: UpsertUserMessage): Promise<User> {
        const client = await this.clientFactory.getClient();
        const item = {
            userId: message.userId,
            email: message.email,
            firstName: message.firstName,
            lastName: message.lastName,
            role: message.role,
            features: message.features,
            dateCreated: client.formatTimestamp(message.dateCreated),
            dateModified: client.formatTimestamp(message.dateModified),
        };

        await client.putItem(this.tableName, item);

        // Return the user object we just created
        return this.mapToUser(item, client);
    }
}
