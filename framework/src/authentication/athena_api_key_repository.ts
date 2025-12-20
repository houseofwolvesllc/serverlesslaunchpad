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
import * as crypto from "crypto";
import { AthenaClient } from "../data/athena/athena_client";
import { AthenaPagingInstruction } from "../data/athena/athena_paging_intstruction";

@Injectable()
export class AthenaApiKeyRepository extends ApiKeyRepository {
    protected readonly athenaClient: AthenaClient;

    constructor(athenaClient: AthenaClient) {
        super();
        this.athenaClient = athenaClient;
    }

    protected mapToApiKey(row: Record<string, any>): ApiKey {
        return {
            apiKeyId: row.apiKeyId,
            userId: row.userId,
            apiKey: row.apiKey,
            description: row.description,
            dateCreated: new Date(row.dateCreated),
            dateLastAccessed: new Date(row.dateLastAccessed),
        };
    }

    async getApiKeys(message: GetApiKeysMessage): Promise<Paginated<ApiKey>> {
        if (message.pagingInstruction && !this.isAthenaPagingInstruction(message.pagingInstruction)) {
            throw new Error("Paging instruction must be an AthenaPagingInstruction");
        }

        let sql = `SELECT * FROM api_keys WHERE userId = ?`;
        const params: any[] = [message.userId];

        if (message.pagingInstruction?.cursor) {
            const operator = message.pagingInstruction.direction === "backward" ? ">" : "<";
            sql += ` WHERE dateCreated ${operator} ?`;
            params.push(message.pagingInstruction.cursor);
        }

        sql += " ORDER BY dateCreated DESC";

        if (message.pagingInstruction) {
            sql += " LIMIT ?";
            params.push(message.pagingInstruction.limit + 1);
        }

        const apiKeys = await this.athenaClient.query(sql, params, this.mapToApiKey.bind(this));

        const hasMore = message.pagingInstruction ? apiKeys.length > message.pagingInstruction.limit : false;
        if (hasMore) {
            apiKeys.pop();
        }

        let next: AthenaPagingInstruction | undefined;
        let previous: AthenaPagingInstruction | undefined;

        if (hasMore && apiKeys.length > 0 && message.pagingInstruction) {
            next = {
                cursor: apiKeys[apiKeys.length - 1].dateCreated.toISOString(),
                limit: message.pagingInstruction.limit,
                direction: "forward",
            };
        }

        if (message.pagingInstruction?.cursor && apiKeys.length > 0) {
            previous = {
                cursor: apiKeys[0].dateCreated.toISOString(),
                limit: message.pagingInstruction.limit,
                direction: "backward",
            };
        }

        return {
            items: apiKeys,
            pagingInstructions: {
                current: message.pagingInstruction,
                next: next,
                previous: previous,
            },
        };
    }

    async createApiKey(message: CreateApiKeyMessage): Promise<ApiKey> {
        const dateCreated = new Date();
        const apiKeyId = crypto.randomUUID();

        const sql = `
            INSERT INTO api_keys (
                apiKeyId,
                userId,
                apiKey,
                description,
                dateCreated,
                dateLastAccessed
            ) VALUES (?, ?, ?, ?, ?, ?)
        `;

        const params = [
            apiKeyId,
            message.userId,
            message.apiKey,
            "API Key",
            this.athenaClient.formatTimestamp(dateCreated),
            this.athenaClient.formatTimestamp(dateCreated),
        ];

        await this.athenaClient.query(sql, params);

        // Fetch and return the actual API key record using the existing mapper
        const apiKeySql = `SELECT * FROM api_keys WHERE apiKeyId = ?`;
        const apiKeyParams = [apiKeyId];
        const apiKeys = await this.athenaClient.query(apiKeySql, apiKeyParams, this.mapToApiKey.bind(this));

        if (apiKeys.length === 0) {
            throw new Error(`Failed to retrieve created API key with id ${apiKeyId}`);
        }

        return apiKeys[0];
    }

    async verifyApiKey(message: VerifyApiKeyMessage): Promise<VerifyApiKeyResult | undefined> {
        const dateLastAccessed = new Date();

        // Use a CTE to update the api key last accessed time and then join with users table
        const sql = `
            WITH updated_api_keys AS (
                UPDATE api_keys 
                SET dateLastAccessed = ?
                WHERE apiKey = ?
            )
            SELECT 
                a.apiKeyId as "apiKey.apiKeyId",
                a.userId as "apiKey.userId",
                a.apiKey as "apiKey.apiKey",
                a.description as "apiKey.description",
                a.dateCreated as "apiKey.dateCreated",
                a.dateLastAccessed as "apiKey.dateLastAccessed",
                u.userId as "user.userId",
                u.email as "user.email",
                u.firstName as "user.firstName",
                u.lastName as "user.lastName",
                u.role as "user.role",
                u.features as "user.features",
                u.dateCreated as "user.dateCreated",
                u.dateModified as "user.dateModified"
            FROM api_keys a
            JOIN users u ON a.userId = u.userId
            WHERE a.apiKey = ?
        `;

        const params = [this.athenaClient.formatTimestamp(dateLastAccessed), message.apiKey, message.apiKey];

        const results = await this.athenaClient.query(sql, params, (row: Record<string, any>) => {
            const apiKey: ApiKey = {
                apiKeyId: row["apiKey.apiKeyId"],
                userId: row["apiKey.userId"],
                apiKey: row["apiKey.apiKey"],
                description: row["apiKey.description"],
                dateCreated: new Date(row["apiKey.dateCreated"]),
                dateLastAccessed: new Date(row["apiKey.dateLastAccessed"]),
            };

            const user: User = {
                userId: row["user.userId"],
                email: row["user.email"],
                firstName: row["user.firstName"],
                lastName: row["user.lastName"],
                role: row["user.role"],
                features: row["user.features"],
                dateCreated: new Date(row["user.dateCreated"]),
                dateModified: new Date(row["user.dateModified"]),
            };

            return { apiKey, user };
        });

        return results.length > 0 ? results[0] : undefined;
    }

    async deleteApiKeys(message: DeleteApiKeysMessage): Promise<void> {
        const sql = `DELETE FROM api_keys WHERE userId = ? AND apiKey IN (${message.apiKeys.map(() => "?").join(",")})`;
        const params = [message.userId, ...message.apiKeys];

        await this.athenaClient.query(sql, params);
    }

    private isAthenaPagingInstruction(
        pagingInstruction: PagingInstruction | undefined
    ): pagingInstruction is AthenaPagingInstruction {
        return (
            pagingInstruction !== undefined && typeof (pagingInstruction as AthenaPagingInstruction).cursor === "string"
        );
    }
}
