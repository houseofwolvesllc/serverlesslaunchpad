import {
    AuthorizeMessage,
    GetSessionsMessage,
    ReauthorizeMessage,
    RevokeSessionMessage,
    Session,
    UnauthorizeMessage,
} from "./types";

import { Paginated } from "@houseofwolves/serverlesslaunchpad.commons";

export interface Authority {
    authorize(message: AuthorizeMessage): Promise<boolean>;
    reauthorize(message: ReauthorizeMessage): Promise<boolean>;
    unauthorize(message: UnauthorizeMessage): Promise<boolean>;
    getSessions(message: GetSessionsMessage): Promise<Paginated<Session>>;
    revokeSession(message: RevokeSessionMessage): Promise<boolean>;
}
