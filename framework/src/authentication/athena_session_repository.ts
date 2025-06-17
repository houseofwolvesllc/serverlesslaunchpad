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
            dateExpires: new Date(row.dateExpires),
        };
    }

    async getSessions(message: {
        sessionToken: string;
        pagingInstruction?: PagingInstruction;
    }): Promise<Paginated<Session>> {
        const userId = message.sessionToken.substring(32);
        const params: SqlParameter[] = [];

        if (message.pagingInstruction && !this.isAthenaPagingInstruction(message.pagingInstruction)) {
            throw new Error("Paging instruction must be an AthenaPagingInstruction");
        }

        let sql = `SELECT * FROM ${this.tableName} WHERE userId = :userId`;
        params.push({ name: "userId", value: userId });

        if (message.pagingInstruction?.cursor) {
            const operator = message.pagingInstruction.direction === "backward" ? ">" : "<";
            sql += ` AND dateCreated ${operator} :cursor`;
            params.push({ name: "cursor", value: message.pagingInstruction.cursor });
        }

        sql += " ORDER BY dateCreated DESC";

        if (message.pagingInstruction) {
            sql += " LIMIT :limit";
            params.push({ name: "limit", value: message.pagingInstruction.size + 1 });
        }

        const sessions = await this.athenaClient.query(sql, params, this.mapToSession.bind(this));

        const hasMore = message.pagingInstruction ? sessions.length > message.pagingInstruction.size : false;
        if (hasMore) {
            sessions.pop();
        }

        let next: AthenaPagingInstruction | undefined;
        let previous: AthenaPagingInstruction | undefined;

        if (hasMore && sessions.length > 0 && message.pagingInstruction) {
            next = {
                cursor: sessions[sessions.length - 1].dateCreated.toISOString(),
                size: message.pagingInstruction.size,
                direction: "forward",
            };
        }

        if (message.pagingInstruction?.cursor && sessions.length > 0) {
            previous = {
                cursor: sessions[0].dateCreated.toISOString(),
                size: message.pagingInstruction.size,
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

    private isAthenaPagingInstruction(
        pagingInstruction: PagingInstruction | undefined
    ): pagingInstruction is AthenaPagingInstruction {
        return (
            pagingInstruction !== undefined && typeof (pagingInstruction as AthenaPagingInstruction).cursor === "string"
        );
    }
}
