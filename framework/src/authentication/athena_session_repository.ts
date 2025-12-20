import { SessionRepository } from "@houseofwolves/serverlesslaunchpad.core";
import { GetSessionsMessage, Paginated, Session } from "@houseofwolves/serverlesslaunchpad.types";
import { AthenaClient, SqlParameter } from "../data/athena/athena_client";
import { AthenaPagingInstruction } from "../data/athena/athena_paging_intstruction";

export class AthenaSessionRepository implements SessionRepository {
    protected readonly athenaClient: AthenaClient;
    protected readonly tableName: string;

    constructor(athenaClient: AthenaClient, tableName: string = "sessions") {
        this.athenaClient = athenaClient;
        this.tableName = tableName;
    }

    protected mapToSession(row: Record<string, any>): Session {
        return {
            sessionId: row.sessionId,
            userId: row.userId,
            sessionSignature: row.sessionSignature,
            ipAddress: row.ipAddress,
            userAgent: row.userAgent,
            dateCreated: new Date(row.dateCreated),
            dateExpires: new Date(row.dateExpires),
        };
    }

    async getSessions(message: {
        sessionToken: string;
        pagingInstruction?: AthenaPagingInstruction;
    }): Promise<Paginated<Session>> {
        const userId = message.sessionToken.substring(32);
        const params: SqlParameter[] = [];

        let sql = `SELECT * FROM ${this.tableName} WHERE userId = :userId`;
        params.push({ name: "userId", value: userId });

        sql += " ORDER BY dateCreated DESC";

        if (message.pagingInstruction) {
            sql += " LIMIT :limit OFFSET :offset";
            params.push({ name: "limit", value: message.pagingInstruction.size });
            params.push({
                name: "offset",
                value: (message.pagingInstruction?.page ?? 0) * message.pagingInstruction.size,
            });
        }

        const sessions = await this.athenaClient.query(sql, params, this.mapToSession.bind(this));
        let next: AthenaPagingInstruction | undefined;
        let previous: AthenaPagingInstruction | undefined;

        if (sessions.length === message.pagingInstruction?.size) {
            next = {
                page: (message.pagingInstruction?.page ?? 0) + 1,
                size: message.pagingInstruction?.size,
            };
        }

        if (message.pagingInstruction?.page && message.pagingInstruction?.page > 0) {
            previous = {
                page: message.pagingInstruction?.page - 1,
                size: message.pagingInstruction?.size,
            };
        }

        return {
            items: sessions,
            pagingInstructions: {
                current: message.pagingInstruction,
                next: next,
                previous: previous,
            },
        };
    }

    async createSession(message: {
        sessionId: string;
        userId: string;
        sessionSignature: string;
        ipAddress: string;
        userAgent: string;
    }): Promise<Session> {
        const dateCreated = new Date();
        const dateExpires = new Date(dateCreated.getTime() + 1000 * 60 * 60 * 24 * 7);
        const sql = `
            INSERT INTO ${this.tableName} (
                sessionId, 
                userId, 
                sessionSignature, 
                ipAddress, 
                userAgent,
                dateCreated,
                dateExpires
            ) VALUES (
                :sessionId,
                :userId,
                :sessionSignature,
                :ipAddress,
                :userAgent,
                :dateCreated,
                :dateExpires
            )
        `;

        const params = [
            { name: "sessionId", value: message.sessionId },
            { name: "userId", value: message.userId },
            { name: "sessionSignature", value: message.sessionSignature },
            { name: "ipAddress", value: message.ipAddress },
            { name: "userAgent", value: message.userAgent },
            { name: "dateCreated", value: this.athenaClient.formatTimestamp(dateCreated) },
            { name: "dateExpires", value: this.athenaClient.formatTimestamp(dateExpires) },
        ];

        await this.athenaClient.query(sql, params);

        return {
            sessionId: message.sessionId,
            userId: message.userId,
            sessionSignature: message.sessionSignature,
            ipAddress: message.ipAddress,
            userAgent: message.userAgent,
            dateCreated: dateCreated,
            dateExpires: dateExpires,
        };
    }

    async deleteSession(message: { sessionId: string }): Promise<void> {
        const sql = `DELETE FROM ${this.tableName} WHERE sessionId = :sessionId`;
        const params: SqlParameter[] = [{ name: "sessionId", value: message.sessionId }];

        await this.athenaClient.query(sql, params);
    }
}
