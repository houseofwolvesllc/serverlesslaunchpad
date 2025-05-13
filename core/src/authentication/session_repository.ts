import { Paginated, PagingInstruction, Session } from "@houseofwolves/serverlesslaunchpad.types";

export interface SessionRepository {
    createSession(message: {
        sessionId: string;
        userId: string;
        sessionSignature: string;
        ipAddress: string;
        userAgent: string;
    }): Promise<Session>;
    getSessions(message: { sessionToken: string; pagingInstruction?: PagingInstruction }): Promise<Paginated<Session>>;
    deleteSession(message: { sessionId: string }): Promise<void>;
}
