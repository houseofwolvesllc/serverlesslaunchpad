import { User } from "../users";

export type AuthenticateMessage = {
    accessToken: string;
    ipAddress: string;
    userAgent: string;
    sessionKey: string;
    email: string;
    firstName: string;
    lastName: string;
};

export type VerifyMessage = {
    sessionToken?: string;
    apiKey?: string;
    ipAddress: string;
    userAgent: string;
};

export type AuthenticateResult = {
    authContext: {
        identity?: User;
        access: {
            type: "session" | "apiKey" | "unknown";
            description?: string;
            ipAddress: string;
            userAgent: string;
            sessionToken?: string;
            dateLastAccessed?: Date;
            dateExpires?: Date;
        };
    };
};

export type RevokeMessage = {
    sessionToken: string;
    ipAddress: string;
    userAgent: string;
};

export abstract class Authenticator {
    abstract authenticate(message: AuthenticateMessage): Promise<AuthenticateResult>;
    abstract verify(message: VerifyMessage): Promise<AuthenticateResult>;
    abstract revoke(message: RevokeMessage): Promise<void>;
}
