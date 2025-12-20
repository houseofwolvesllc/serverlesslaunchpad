import {
    AuthorizeMessage,
    GetSessionsMessage,
    Paginated,
    ReauthorizeMessage,
    RevokeSessionMessage,
    Session,
    UnauthorizeMessage,
} from "@houseofwolves/serverlesslaunchpad.types";

export interface Authority {
    authorize(message: AuthorizeMessage): Promise<boolean>;
    reauthorize(message: ReauthorizeMessage): Promise<boolean>;
    unauthorize(message: UnauthorizeMessage): Promise<boolean>;
    getSessions(message: GetSessionsMessage): Promise<Paginated<Session>>;
    revokeSession(message: RevokeSessionMessage): Promise<boolean>;
}
