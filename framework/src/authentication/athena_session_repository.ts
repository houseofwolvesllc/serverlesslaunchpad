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
import { AthenaClient } from "../data/athena/athena_client";
import { AthenaPagingInstruction } from "../data/athena/athena_paging_intstruction";

@Injectable()
export class AthenaSessionRepository extends SessionRepository {
    protected readonly athenaClient: AthenaClient;

    constructor(athenaClient: AthenaClient) {
        super();
        this.athenaClient = athenaClient;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected mapToSession(row: Record<string, any>): Session {
        return {
            sessionId: row.sessionId,
            userId: row.userId,
            ipAddress: row.ipAddress,
            userAgent: row.userAgent,
            dateLastAccessed: new Date(row.dateLastAccessed),
            dateCreated: new Date(row.dateCreated),
            dateExpires: new Date(row.dateExpires),
        };
    }

    async getSessionById(message: GetSessionByIdMessage): Promise<Session | undefined> {
        const sql = `SELECT * FROM sessions WHERE userId = ? AND sessionId = ?`;
        const params = [message.userId, message.sessionId];

        const result = await this.athenaClient.query(sql, params, this.mapToSession.bind(this));
        return result.length > 0 ? result[0] : undefined;
    }

    async getSessionBySignature(message: GetSessionBySignatureMessage): Promise<Session | undefined> {
        const sql = `SELECT * FROM sessions WHERE userId = ? AND sessionSignature = ?`;
        const params = [message.userId, message.sessionSignature];

        const result = await this.athenaClient.query(sql, params, this.mapToSession.bind(this));
        return result.length > 0 ? result[0] : undefined;
    }

    async getSessions(message: GetSessionsMessage): Promise<Paginated<Session>> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const params: any[] = [];

        if (message.pagingInstruction && !this.isAthenaPagingInstruction(message.pagingInstruction)) {
            throw new Error("Paging instruction must be an AthenaPagingInstruction");
        }

        let sql = `SELECT * FROM sessions WHERE userId = ?`;
        params.push(message.userId);

        if (message.pagingInstruction?.cursor) {
            const operator = message.pagingInstruction.direction === "backward" ? ">" : "<";
            sql += ` AND dateCreated ${operator} ?`;
            params.push(message.pagingInstruction.cursor);
        }

        sql += " ORDER BY dateCreated DESC";

        if (message.pagingInstruction) {
            sql += " LIMIT ?";
            params.push(message.pagingInstruction.limit + 1);
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
            INSERT INTO sessions (
                sessionId, 
                userId, 
                sessionSignature, 
                ipAddress, 
                userAgent,
                dateCreated,
                dateLastAccessed,
                dateExpires
            ) VALUES (
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?
            )
        `;

        const params = [
            message.sessionId,
            message.userId,
            message.sessionSignature,
            message.ipAddress,
            message.userAgent,
            this.athenaClient.formatTimestamp(dateCreated),
            this.athenaClient.formatTimestamp(dateCreated),
            this.athenaClient.formatTimestamp(dateExpires),
        ];

        await this.athenaClient.query(sql, params);

        // Fetch and return the actual session record using the existing mapper
        const sessionSql = `SELECT * FROM sessions WHERE sessionId = ? AND userId = ?`;
        const sessionParams = [message.sessionId, message.userId];
        const sessions = await this.athenaClient.query(sessionSql, sessionParams, this.mapToSession.bind(this));

        if (sessions.length === 0) {
            throw new Error(`Failed to retrieve created session with id ${message.sessionId}`);
        }

        return sessions[0];
    }

    async verifySession(message: VerifySessionMessage): Promise<VerifySessionResult | undefined> {
        const dateLastAccessed = new Date();
        const dateExpires = new Date(dateLastAccessed.getTime() + 1000 * 60 * 60 * 24 * 7); // 7 days from now

        // Use a CTE to update the session and then join with users table to get both session and user data
        const sql = `
            WITH updated_sessions AS (
                UPDATE sessions 
                SET dateLastAccessed = ?, dateExpires = ?
                WHERE userId = ? AND sessionSignature = ?
            )
            SELECT 
                s.sessionId as "session.sessionId",
                s.userId as "session.userId",
                s.ipAddress as "session.ipAddress",
                s.userAgent as "session.userAgent",
                s.dateCreated as "session.dateCreated",
                s.dateLastAccessed as "session.dateLastAccessed",
                s.dateExpires as "session.dateExpires",
                u.userId as "user.userId",
                u.email as "user.email",
                u.firstName as "user.firstName",
                u.lastName as "user.lastName",
                u.role as "user.role",
                u.features as "user.features",
                u.dateCreated as "user.dateCreated",
                u.dateModified as "user.dateModified"
            FROM sessions s
            JOIN users u ON s.userId = u.userId
            WHERE s.userId = ? AND s.sessionSignature = ?
        `;

        const params = [
            this.athenaClient.formatTimestamp(dateLastAccessed),
            this.athenaClient.formatTimestamp(dateExpires),
            message.userId,
            message.sessionSignature,
            message.userId,
            message.sessionSignature,
        ];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const results = await this.athenaClient.query(sql, params, (row: Record<string, any>) => {
            const session: Session = {
                sessionId: row["session.sessionId"],
                userId: row["session.userId"],
                ipAddress: row["session.ipAddress"],
                userAgent: row["session.userAgent"],
                dateCreated: new Date(row["session.dateCreated"]),
                dateLastAccessed: new Date(row["session.dateLastAccessed"]),
                dateExpires: new Date(row["session.dateExpires"]),
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

            return { session, user };
        });

        return results.length > 0 ? results[0] : undefined;
    }

    async deleteSessionBySignature(message: DeleteSessionBySignatureMessage): Promise<boolean> {
        const sql = `DELETE FROM sessions WHERE userId = ? AND sessionSignature = ?`;
        const params = [message.userId, message.sessionSignature];

        try {
            await this.athenaClient.query(sql, params);
            return true;
        } catch (error) {
            // Session deletion failed
            return false;
        }
    }

    async deleteSessions(message: DeleteSessionsMessage): Promise<boolean> {
        const placeholders = message.sessionIds.map(() => "?").join(",");
        const sql = `DELETE FROM sessions WHERE userId = ? AND sessionId IN (${placeholders})`;
        const params = [message.userId, ...message.sessionIds];

        try {
            await this.athenaClient.query(sql, params);
            return true;
        } catch (error) {
            // Sessions deletion failed
            return false;
        }
    }

    private isAthenaPagingInstruction(
        pagingInstruction: PagingInstruction | undefined
    ): pagingInstruction is AthenaPagingInstruction {
        return (
            pagingInstruction !== undefined && typeof (pagingInstruction as AthenaPagingInstruction).cursor === "string"
        );
    }
}
