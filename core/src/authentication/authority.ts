import { AuthorizeMessage, ReauthorizeMessage, UnauthorizeMessage } from "./types";

export abstract class Authority {
    abstract authorize(message: AuthorizeMessage): Promise<Session>;
    abstract reauthorize(message: ReauthorizeMessage): Promise<void>;
    abstract unauthorize(message: UnauthorizeMessage): Promise<void>;
}
