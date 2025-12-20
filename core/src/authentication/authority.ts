import { User } from "../users";

export abstract class Authority {
    abstract authorize(message: AuthorizeMessage): Promise<User>;
    abstract reauthorize(message: ReauthorizeMessage): Promise<void>;
    abstract unauthorize(message: UnauthorizeMessage): Promise<void>;
}

export type AuthorizeMessage = {
    sessionToken: string;
    ipAddress: string;
    userAgent: string;
};

export type ReauthorizeMessage = {
    sessionToken: string;
    ipAddress: string;
    userAgent: string;
};

export type UnauthorizeMessage = {
    sessionToken: string;
    ipAddress: string;
    userAgent: string;
};
