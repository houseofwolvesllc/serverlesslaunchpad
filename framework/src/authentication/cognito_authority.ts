import { Authority, SessionRepository } from "@houseofwolves/serverlesslaunchpad.core";
import {
    AuthorizeMessage,
    GetSessionsMessage,
    InvalidAccessTokenError,
    Paginated,
    ReauthorizeMessage,
    RevokeSessionMessage,
    Session,
    UnauthorizeMessage,
} from "@houseofwolves/serverlesslaunchpad.types";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import { ResourcesConfig } from "@aws-amplify/core";
import { randomUUID } from "crypto";

export class CognitoAuthority implements Authority {
    private readonly sessionRepository: SessionRepository;
    private readonly amplifyResourcesConfig: ResourcesConfig;

    constructor(amplifyResourcesConfig: ResourcesConfig, sessionRepository: SessionRepository) {
        this.amplifyResourcesConfig = amplifyResourcesConfig;
        this.sessionRepository = sessionRepository;
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
        this.upsertUser(message);
        this.createSession(message);

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

    private async createSession(message: AuthorizeMessage): Promise<void> {
        const sessionToken = this.generateSessionToken(message);
        const sessionId = randomUUID();

        return this.sessionRepository.createSession({
            sessionId: sessionId,
            userId: message.userId,
            ipAddress: message.ipAddress,
            userAgent: message.userAgent,
            createdDate: new Date(),
            expirationDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
        });
    }

    private async upsertUser(message: AuthorizeMessage): Promise<void> {
        const user = this.buildUser(message);
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
