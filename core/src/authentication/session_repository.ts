import { Paginated, PagingInstruction } from "@houseofwolves/serverlesslaunchpad.commons";
import { User } from "../users";

export abstract class SessionProvider {
    abstract getSessionById(message: GetSessionByIdMessage): Promise<Session | undefined>;
    abstract getSessionBySignature(message: GetSessionBySignatureMessage): Promise<Session | undefined>;
    abstract getSessions(message: GetSessionsMessage): Promise<Paginated<Session>>;
}

export abstract class SessionRepository extends SessionProvider {
    abstract createSession(message: CreateSessionMessage): Promise<Session>;
    abstract verifySession(message: VerifySessionMessage): Promise<VerifySessionResult | undefined>;
    abstract deleteSession(message: DeleteSessionMessage): Promise<boolean>;
    abstract deleteSessions(message: DeleteSessionsMessage): Promise<boolean>;
}

export type Session = {
    sessionId: string;
    userId: string;
    ipAddress: string;
    userAgent: string;
    dateCreated: Date;
    dateLastAccessed: Date;
    dateExpires: Date;
};

export type VerifySessionResult = {
    session: Session;
    user: User;
};

export type GetSessionByIdMessage = {
    userId: string;
    sessionId: string;
};

export type GetSessionBySignatureMessage = {
    userId: string;
    sessionSignature: string;
};

export type GetSessionsMessage = {
    userId: string;
    pagingInstruction?: PagingInstruction;
};

export type CreateSessionMessage = {
    sessionId: string;
    userId: string;
    sessionSignature: string;
    ipAddress: string;
    userAgent: string;
};

export type VerifySessionMessage = {
    userId: string;
    sessionSignature: string;
};

export type DeleteSessionMessage = {
    userId: string;
    sessionSignature: string;
};

export type DeleteSessionsMessage = {
    userId: string;
    sessionIds: string[];
};
