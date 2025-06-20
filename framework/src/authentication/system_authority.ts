import {
    Authority,
    AuthorizeMessage,
    Features,
    ReauthorizeMessage,
    Role,
    Session,
    SessionRepository,
    UnauthorizeMessage,
    User,
    UserRepository,
} from "@houseofwolves/serverlesslaunchpad.core";
import * as crypto from "crypto";

export class CognitoAuthority implements Authority {
    private readonly sessionRepository: SessionRepository;
    private readonly userRepository: UserRepository;

    constructor(sessionRepository: SessionRepository, userRepository: UserRepository) {
        this.sessionRepository = sessionRepository;
        this.userRepository = userRepository;
    }

    async authorize(message: AuthorizeMessage): Promise<Session> {
        const user = await this.upsertUser(message);
        return await this.createSession(message, user);
    }

    private async createSession(message: AuthorizeMessage, user: User): Promise<Session> {
        const sessionSignature = this.generateSessionSignature(message);
        const sessionId = crypto.randomUUID();

        return await this.sessionRepository.createSession({
            sessionId: sessionId,
            userId: user.userId,
            sessionSignature: sessionSignature,
            ipAddress: message.ipAddress,
            userAgent: message.userAgent,
        });
    }

    private generateSessionSignature(message: AuthorizeMessage): string {
        const { sessionKey } = this.parseSessionToken(message.sessionToken);

        return crypto
            .createHash("md5")
            .update(`${sessionKey}_${message.ipAddress}_${message.userAgent}_${process.env.SESSION_TOKEN_SALT}`)
            .digest("hex");
    }

    private async upsertUser(message: AuthorizeMessage): Promise<User> {
        const user = await this.userRepository.getUser({
            email: message.email,
        });

        return this.userRepository.upsertUser({
            userId: user?.userId ?? crypto.randomUUID(),
            email: message.email,
            firstName: user?.firstName ?? message.firstName,
            lastName: user?.lastName ?? message.lastName,
            role: user?.role ?? Role.Base,
            features: user?.features ?? Features.None,
            dateCreated: user?.dateCreated ?? new Date(),
            dateModified: new Date(),
        });
    }

    async reauthorize(message: ReauthorizeMessage): Promise<void> {
        const { userId } = this.parseSessionToken(message.sessionToken);
        const sessionSignature = this.generateSessionSignature(message);
        const session = await this.sessionRepository.extendSession({ userId, sessionSignature });

        if (!session) {
            throw new InvalidSessionError("Session not found");
        }

        return;
    }

    async unauthorize(_message: UnauthorizeMessage): Promise<boolean> {
        // parse session token
        // get session from session repository
        // if session is not found return true
        // if session is found delete session
        return true;
    }

    private parseSessionToken(sessionToken: string): { sessionKey: string; userId: string } {
        const sessionKey = sessionToken.substring(0, 32);
        const userId = sessionToken.substring(32);
        return { sessionKey, userId };
    }
}

/*
// Lambda function
const { CognitoJwtVerifier } = require("aws-jwt-verify");

exports.handler = async (event) => {
    // Extract the token from the Authorization header
    const token = event.headers.Authorization?.replace('Bearer ', '');
    
    if (!token) {
        return {
            statusCode: 401,
            body: JSON.stringify({ message: 'No token provided' })
        };
    }

    // Create a verifier that expects valid access tokens
    const verifier = CognitoJwtVerifier.create({
        userPoolId: process.env.COGNITO_USER_POOL_ID,
        tokenUse: "access", // Specify "access" or "id" for ID tokens
        clientId: process.env.COGNITO_CLIENT_ID
    });

    try {
        // Verify the token
        const payload = await verifier.verify(token);
        console.log("Token is valid. Payload:", payload);
        
        // If verification succeeds, you can use the claims in payload
        // for your business logic
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Token verified successfully',
                username: payload.username,
                // other claims as needed
            })
        };
    } catch (error) {
        console.error("Token verification failed:", error);
        return {
            statusCode: 401,
            body: JSON.stringify({ message: 'Invalid token' })
        };
    }
};

*/
