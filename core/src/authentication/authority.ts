import {
    AuthorizeMessage,
    GetSessionsMessage,
    ReauthorizeMessage,
    RevokeSessionMessage,
    Session,
    UnauthorizeMessage,
} from "./types";

import { Paginated } from "@houseofwolves/serverlesslaunchpad.commons";

export abstract class Authority {
    abstract authorize(message: AuthorizeMessage): Promise<boolean>;
    abstract reauthorize(message: ReauthorizeMessage): Promise<boolean>;
    abstract unauthorize(message: UnauthorizeMessage): Promise<boolean>;
    abstract getSessions(message: GetSessionsMessage): Promise<Paginated<Session>>;
    abstract revokeSession(message: RevokeSessionMessage): Promise<boolean>;
}
