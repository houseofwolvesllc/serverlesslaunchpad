import { Paginated, PagingInstruction } from "@houseofwolves/serverlesslaunchpad.commons";
import { Session } from "./types";

export abstract class SessionProvider {
    abstract getSession(message: {
        userId: string;
        sessionId?: string;
        sessionSignature?: string;
    }): Promise<Session | undefined>;

    abstract getSessions(message: {
        userId: string;
        pagingInstruction?: PagingInstruction;
    }): Promise<Paginated<Session>>;
}

export abstract class SessionRepository extends SessionProvider {
    abstract createSession(message: {
        sessionId: string;
        userId: string;
        sessionSignature: string;
        ipAddress: string;
        userAgent: string;
    }): Promise<Session>;

    abstract extendSession(message: { userId: string; sessionSignature: string }): Promise<Session | undefined>;

    abstract deleteSession(message: {
        userId: string;
        sessionId?: string;
        sessionSignature?: string;
    }): Promise<boolean>;
}
