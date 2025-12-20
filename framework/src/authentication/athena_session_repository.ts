import { SessionRepository } from "@houseofwolves/serverlesslaunchpad.core";
import { GetSessionsMessage, Paginated, Session } from "@houseofwolves/serverlesslaunchpad.types";

export class AthenaSessionRepository implements SessionRepository {
    constructor(private readonly athenaClient: AthenaClient) {}

    async getSessions(message: GetSessionsMessage): Promise<Paginated<Session>> {
        const sessions = await this.athenaClient.getSessions(message);
        return sessions;
    }
}
