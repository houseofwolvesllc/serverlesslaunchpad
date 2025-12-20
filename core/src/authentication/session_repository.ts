import { Paginated, PagingInstruction } from "@houseofwolves/serverlesslaunchpad.commons";
import { Session } from "./types";

export abstract class SessionRepository {
    abstract createSession(message: {
        sessionId: string;
        userId: string;
        sessionSignature: string;
        ipAddress: string;
        userAgent: string;
    }): Promise<Session>;

    abstract getSessions(message: {
        sessionToken: string;
        pagingInstruction?: PagingInstruction;
    }): Promise<Paginated<Session>>;

    abstract deleteSession(message: { sessionId: string }): Promise<void>;
}
