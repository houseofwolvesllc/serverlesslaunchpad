import {
    Authenticator,
    Injectable,
    User
} from "@houseofwolves/serverlesslaunchpad.core";
import { z } from "zod";
import { BaseController } from "../base_controller";
import { UnauthorizedError } from "../common/errors";
import { ExtendedALBEvent } from "../common/extended_alb_event";
import { HypermediaResponse } from "../common/types";
import { Route } from "../router";

// Define the authentication request schema
const authenticateSchema = z.object({
    headers: z.object({
        authorization: z.string().startsWith('Bearer '),
        'user-agent': z.string(),
        'x-forwarded-for': z.string()
    }),
    body: z.object({
        sessionKey: z.string(),
        email: z.string().email(),
        firstName: z.string(),
        lastName: z.string()
    })
});

const signoutSchema = z.object({
    headers: z.object({
        authorization: z.string().startsWith('SessionToken '),
        'user-agent': z.string(),
        'x-forwarded-for': z.string()        
    })
});

// type AuthMessage = z.infer<typeof AuthMessageSchema>;

/**
 * Controller handling authentication endpoints.
 * Uses the IoC container to inject dependencies.
 */
@Injectable()
export class AuthenticationController extends BaseController {
    constructor(
        private authenticator: Authenticator
    ) {
        super();
    }

    /**
     * Authenticate a user with a JWT token.
     * Returns hypermedia response with available actions based on user's permissions.
     */
    @Route('POST', '/signin')
    async authenticate(event: ExtendedALBEvent): Promise<HypermediaResponse> {
        
        const { headers, body } = this.parseRequest(event, authenticateSchema);

        const authMessage = {
            accessToken: headers.authorization.replace('Bearer ', ''),
            ipAddress: headers['x-forwarded-for'],
            userAgent: headers['user-agent'],
            sessionKey: body.sessionKey,
            email: body.email,
            firstName: body.firstName,
            lastName: body.lastName,
        };

        // Use Authority to authorize and get the authenticated user
        const authResult = await this.authenticator.authenticate(authMessage);

        if (!authResult.authContext.identity) {
            throw new UnauthorizedError("Bearer failed validation.");
        }

        // Return hypermedia response with available actions
        return this.success({
            user: authResult.authContext.identity,
            authContext: authResult.authContext,
            links: this.buildUserLinks(authResult.authContext.identity)
        });
    }

    /**
     * Build hypermedia links based on user's permissions.
     */
    private buildUserLinks(user: User): Array<{ rel: string[]; href: string }> {
        const links = [
            {
                rel: ["self"],
                href: `/users/${user.userId}`
            }
        ];

        // Add session management links
        links.push({
            rel: ["sessions"],
            href: `/users/${user.userId}/sessions/`
        });

        // Add API key management links
        links.push({
            rel: ["api-keys"],
            href: `/users/${user.userId}/api_keys/`
        });

        return links;
    }

    @Route('POST', '/signout')
    async signout(event: ExtendedALBEvent): Promise<HypermediaResponse> {
        const { headers } = this.parseRequest(event, signoutSchema);

        await this.authenticator.revoke({
            sessionToken: headers.authorization.replace('SessionToken ', ''),
            ipAddress: headers['x-forwarded-for'],
            userAgent: headers['user-agent'],
        });

        return this.success({});
    }
}