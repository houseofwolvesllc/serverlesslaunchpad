import { Paginated, PagingInstruction } from "@houseofwolves/serverlesslaunchpad.commons";
import { Session, SessionRepository } from "@houseofwolves/serverlesslaunchpad.core";
import { AthenaClient, SqlParameter } from "../data/athena/athena_client";
import { AthenaPagingInstruction } from "../data/athena/athena_paging_intstruction";

export class AthenaSessionRepository extends SessionRepository {
    protected readonly athenaClient: AthenaClient;
    protected readonly tableName: string;

    constructor(athenaClient: AthenaClient, tableName: string = "sessions") {
        super();
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
            dateModified: new Date(row.dateModified),
            dateExpires: new Date(row.dateExpires),
        };
    }

    async getSession(message: {
        userId: string;
        sessionId?: string;
        sessionSignature?: string;
    }): Promise<Session | undefined> {
        const params: SqlParameter[] = [];

        if (message.sessionId) {
            params.push({ name: "sessionId", value: message.sessionId });
        }

        if (message.sessionSignature) {
            params.push({ name: "sessionSignature", value: message.sessionSignature });
        }

        let sql = `SELECT * FROM ${this.tableName} WHERE userId = :userId`;
        params.push({ name: "userId", value: message.userId });

        if (message.sessionId) {
            sql += " AND sessionId = :sessionId";
            params.push({ name: "sessionId", value: message.sessionId });
        }

        if (message.sessionSignature) {
            sql += " AND sessionSignature = :sessionSignature";
            params.push({ name: "sessionSignature", value: message.sessionSignature });
        }

        const result = await this.athenaClient.query(sql, params, this.mapToSession.bind(this));
        return result.length > 0 ? result[0] : undefined;
    }

    async getSessions(message: { userId: string; pagingInstruction?: PagingInstruction }): Promise<Paginated<Session>> {
        const params: SqlParameter[] = [];

        if (message.pagingInstruction && !this.isAthenaPagingInstruction(message.pagingInstruction)) {
            throw new Error("Paging instruction must be an AthenaPagingInstruction");
        }

        let sql = `SELECT * FROM ${this.tableName} WHERE userId = :userId`;
        params.push({ name: "userId", value: message.userId });

        if (message.pagingInstruction?.cursor) {
            const operator = message.pagingInstruction.direction === "backward" ? ">" : "<";
            sql += ` AND dateCreated ${operator} :cursor`;
            params.push({ name: "cursor", value: message.pagingInstruction.cursor });
        }

        sql += " ORDER BY dateCreated DESC";

        if (message.pagingInstruction) {
            sql += " LIMIT :limit";
            params.push({ name: "limit", value: message.pagingInstruction.limit + 1 });
        }

        const sessions = await this.athenaClient.query(sql, params, this.mapToSession.bind(this));

        const hasMore = message.pagingInstruction ? sessions.length > message.pagingInstruction.limit : false;
        if (hasMore) {
            sessions.pop();
        }

        let next: AthenaPagingInstruction | undefined;
        let previous: AthenaPagingInstruction | undefined;

        if (hasMore && sessions.length > 0 && message.pagingInstruction) {
            next = {
                cursor: sessions[sessions.length - 1].dateCreated.toISOString(),
                limit: message.pagingInstruction.limit,
                direction: "forward",
            };
        }

        if (message.pagingInstruction?.cursor && sessions.length > 0) {
            previous = {
                cursor: sessions[0].dateCreated.toISOString(),
                limit: message.pagingInstruction.limit,
                direction: "backward",
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
                dateModified,
                dateExpires
            ) VALUES (
                :sessionId,
                :userId,
                :sessionSignature,
                :ipAddress,
                :userAgent,
                :dateCreated,
                :dateModified,
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
            { name: "dateModified", value: this.athenaClient.formatTimestamp(dateCreated) },
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
            dateModified: dateCreated,
            dateExpires: dateExpires,
        };
    }

    async deleteSession(message: { userId: string; sessionId: string }): Promise<void> {
        const sql = `DELETE FROM ${this.tableName} WHERE userId = :userId AND sessionId = :sessionId`;
        const params: SqlParameter[] = [
            { name: "userId", value: message.userId },
            { name: "sessionId", value: message.sessionId },
        ];

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
