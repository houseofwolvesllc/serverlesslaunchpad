import { Paginated, PagingInstruction } from "@houseofwolves/serverlesslaunchpad.commons";
import { Session } from "./types";

export abstract class SessionProvider {
    abstract getSession(message: { sessionId: string }): Promise<Session | undefined>;

    abstract getSessions(message: { pagingInstruction?: PagingInstruction }): Promise<Paginated<Session>>;
}

export abstract class SessionRepository extends SessionProvider {
    abstract createSession(message: {
        sessionId: string;
        userId: string;
        sessionSignature: string;
        ipAddress: string;
        userAgent: string;
    }): Promise<Session>;

    abstract deleteSession(message: { sessionId: string }): Promise<void>;
}
