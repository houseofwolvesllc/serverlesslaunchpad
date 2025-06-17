import { ResourcesConfig } from "@aws-amplify/core";
import { Paginated } from "@houseofwolves/serverlesslaunchpad.commons";
import {
    Authority,
    AuthorizeMessage,
    Features,
    GetSessionsMessage,
    InvalidAccessTokenError,
    ReauthorizeMessage,
    RevokeSessionMessage,
    Role,
    Session,
    SessionRepository,
    UnauthorizeMessage,
    User,
    UserRepository,
} from "@houseofwolves/serverlesslaunchpad.core";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import * as crypto from "crypto";

export class CognitoAuthority implements Authority {
    private readonly amplifyResourcesConfig: ResourcesConfig;
    private readonly sessionRepository: SessionRepository;
    private readonly userRepository: UserRepository;

    constructor(
        amplifyResourcesConfig: ResourcesConfig,
        sessionRepository: SessionRepository,
        userRepository: UserRepository
    ) {
        this.amplifyResourcesConfig = amplifyResourcesConfig;
        this.sessionRepository = sessionRepository;
        this.userRepository = userRepository;
    }

    async authorize(message: AuthorizeMessage): Promise<boolean> {
        // verify access token
        // get user from email address
        // if no user exists build user
        // upsert user
        // build sessionHash from message.sessionKey
        // upsert user and session
        // return sessionToken (this will be used for reauthorization or un-authorization)

        this.verifyAccessToken(message.accessToken);
        const user = await this.upsertUser(message);
        this.createSession(message, user);

        return true;
    }

    private async verifyAccessToken(accessToken: string): Promise<void> {
        const verifier = CognitoJwtVerifier.create({
            userPoolId: this.amplifyResourcesConfig.Auth?.Cognito?.userPoolId ?? "",
            tokenUse: "access",
            clientId: this.amplifyResourcesConfig.Auth?.Cognito?.userPoolClientId ?? "",
        });

        try {
            verifier.verify(accessToken);
        } catch (err) {
            console.error(err);
            throw new InvalidAccessTokenError("Invalid access token");
        }
    }

    private async createSession(message: AuthorizeMessage, user: User): Promise<void> {
        const sessionSignature = this.generateSessionSignature(message);
        const sessionId = crypto.randomUUID();

        this.sessionRepository.createSession({
            sessionId: sessionId,
            userId: user.userId,
            sessionSignature: sessionSignature,
            ipAddress: message.ipAddress,
            userAgent: message.userAgent,
        });
    }

    private generateSessionSignature(message: AuthorizeMessage): string {
        const sessionKey = message.sessionToken.substring(0, 32);
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
            firstName: message.firstName,
            lastName: message.lastName,
            role: Role.Base,
            features: Features.None,
            dateCreated: new Date(),
            dateModified: new Date(),
        });
    }

    async reauthorize(_message: ReauthorizeMessage): Promise<boolean> {
        return true;
    }

    async unauthorize(_message: UnauthorizeMessage): Promise<boolean> {
        return true;
    }

    async getSessions(_message: GetSessionsMessage): Promise<Paginated<Session>> {
        return {
            items: [],
            pagingInstructions: {},
        };
    }

    async revokeSession(_message: RevokeSessionMessage): Promise<boolean> {
        return true;
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
