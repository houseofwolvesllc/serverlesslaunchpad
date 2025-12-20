import { Paginated, Session } from "@houseofwolves/serverlesslaunchpad.types";

export interface SessionRepository {
    getSessions(message: { userId: string }): Promise<Paginated<Session>>;
    deleteSession(message: { sessionId: string }): Promise<void>;
}
