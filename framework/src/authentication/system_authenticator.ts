import {
    ApiKeyRepository,
    AuthenticateMessage,
    AuthenticateResult,
    Authenticator,
    ConfigurationStore,
    Features,
    Injectable,
    RevokeMessage,
    Role,
    SessionRepository,
    UserRepository,
    VerifyMessage,
} from "@houseofwolves/serverlesslaunchpad.core";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import crypto from "crypto";

@Injectable()
export class SystemAuthenticator implements Authenticator {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly sessionRepository: SessionRepository,
        private readonly apiKeyRepository: ApiKeyRepository,
        private readonly configuration: ConfigurationStore<{
            auth: { cognito: { userPoolId: string; userPoolClientId: string } } | undefined;
            session_token_salt: string;
        }>
    ) {}

    async authenticate(message: AuthenticateMessage): Promise<AuthenticateResult> {
        const isAuthenticated = await this.verifyAccessToken(message.accessToken);
        if (isAuthenticated) {
            let user = await this.userRepository.getUserByEmail({ email: message.email });

            if (!user) {
                user = await this.userRepository.upsertUser({
                    userId: crypto.randomUUID(),
                    email: message.email,
                    firstName: message.firstName,
                    lastName: message.lastName,
                    role: Role.Base,
                    features: Features.None,
                    dateCreated: new Date(),
                    dateModified: new Date(),
                });
            }

            const session = await this.sessionRepository.createSession({
                userId: user.userId,
                sessionId: crypto.randomUUID(),
                sessionSignature: await this.generateSessionSignature(message),
                ipAddress: message.ipAddress,
                userAgent: message.userAgent,
            });

            return {
                authContext: {
                    identity: user,
                    access: {
                        type: "session",
                        ipAddress: message.ipAddress,
                        userAgent: message.userAgent,
                        sessionToken: message.sessionKey + user.userId,
                        dateLastAccessed: session.dateLastAccessed,
                        dateExpires: session.dateExpires,
                    },
                },
            };
        }

        return {
            authContext: {
                identity: undefined,
                access: {
                    type: "unknown",
                    ipAddress: message.ipAddress,
                    userAgent: message.userAgent,
                },
            },
        };
    }

    private async verifyAccessToken(accessToken: string): Promise<boolean> {
        const configuration = await this.configuration.get();
        const cognito = configuration.auth?.cognito;

        if (!cognito) {
            throw new Error("Cognito configuration not found");
        }

        const verifier = CognitoJwtVerifier.create({
            userPoolId: cognito.userPoolId,
            tokenUse: "access",
            clientId: cognito.userPoolClientId,
        });

        try {
            await verifier.verify(accessToken);
            return true;
        } catch (error) {
            // Token verification failed - this is expected for invalid tokens
            return false;
        }
    }

    private async generateSessionSignature(message: {
        sessionKey: string;
        ipAddress: string;
        userAgent: string;
    }): Promise<string> {
        const config = await this.configuration.get();
        return crypto
            .createHash("sha256")
            .update(`${message.sessionKey}_${message.ipAddress}_${message.userAgent}_${config.session_token_salt}`)
            .digest("hex");
    }

    async verify(message: VerifyMessage): Promise<AuthenticateResult> {
        if (message.sessionToken) {
            const { sessionKey, userId } = this.parseSessionToken(message.sessionToken);

            const sessionSignature = await this.generateSessionSignature({
                sessionKey,
                ipAddress: message.ipAddress,
                userAgent: message.userAgent,
            });

            const result = await this.sessionRepository.verifySession({
                userId,
                sessionSignature,
            });

            if (!result) {
                return {
                    authContext: {
                        identity: undefined,
                        access: {
                            type: "session",
                            ipAddress: message.ipAddress,
                            userAgent: message.userAgent,
                        },
                    },
                };
            }

            return {
                authContext: {
                    identity: result.user,
                    access: {
                        type: "session",
                        ipAddress: result.session.ipAddress,
                        userAgent: result.session.userAgent,
                        dateLastAccessed: result.session.dateLastAccessed,
                        dateExpires: result.session.dateExpires,
                    },
                },
            };
        }

        if (message.apiKey) {
            const result = await this.apiKeyRepository.verifyApiKey({ apiKey: message.apiKey });

            if (!result) {
                return {
                    authContext: {
                        identity: undefined,
                        access: {
                            type: "apiKey",
                            ipAddress: message.ipAddress,
                            userAgent: message.userAgent,
                        },
                    },
                };
            }

            return {
                authContext: {
                    identity: result.user,
                    access: {
                        type: "apiKey",
                        ipAddress: message.ipAddress,
                        userAgent: message.userAgent,
                        description: result.apiKey.description,
                        dateLastAccessed: result.apiKey.dateLastAccessed,
                    },
                },
            };
        }

        return {
            authContext: {
                identity: undefined,
                access: {
                    type: "unknown",
                    ipAddress: message.ipAddress,
                    userAgent: message.userAgent,
                },
            },
        };
    }

    private parseSessionToken(sessionToken: string): { sessionKey: string; userId: string } {
        const sessionKey = sessionToken.substring(0, 32);
        const userId = sessionToken.substring(32);
        return { sessionKey, userId };
    }

    async revoke(message: RevokeMessage): Promise<void> {
        const { sessionKey, userId } = this.parseSessionToken(message.sessionToken);

        const sessionSignature = await this.generateSessionSignature({
            sessionKey,
            ipAddress: message.ipAddress,
            userAgent: message.userAgent,
        });

        await this.sessionRepository.deleteSessionBySignature({
            userId,
            sessionSignature,
        });
    }
}
