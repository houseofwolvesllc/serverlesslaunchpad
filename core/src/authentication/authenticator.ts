export type AuthenticateMessage = {
    accessToken?: string;
    apiKey?: string;
};

export abstract class Authenticator {
    abstract authenticate(message: AuthenticateMessage): Promise<boolean>;
}
