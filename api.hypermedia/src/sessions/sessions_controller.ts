import { Injectable, Role, SessionRepository } from "@houseofwolves/serverlesslaunchpad.core";
import { ALBResult } from "aws-lambda";
import { BaseController } from "../base_controller.js";
import { AuthenticatedALBEvent } from "../extended_alb_event.js";
import { Cache, Log, Protected } from "../decorators/index.js";
import { Route } from "../router.js";
import { DeleteSessionsSchema, GetSessionsSchema } from "./schemas.js";
import { SessionCollectionAdapter } from "./session_collection_adapter.js";
import { SessionDeletionAdapter } from "./session_deletion_adapter.js";

/**
 * Sessions endpoint controller demonstrating proper decorator usage
 */
@Injectable()
export class SessionsController extends BaseController {
    constructor(
        private sessionRepository: SessionRepository
    ) {
        super();
    }

    /**
     * Get paginated list of user sessions
     * Example: POST /users/123/sessions/list
     * Body: { "pagingInstruction": { ... } }
     * 
     * Decorator execution order (bottom to top):
     * 1. Cache - checks ETag first
     * 2. Protected - authenticates user and validates role/owner access
     * 3. Log - wraps entire execution
     */
    @Log()
    @Protected()
    @Cache({ ttl: 300, vary: ['Authorization'] })
    @Route('POST', '/users/{userId}/sessions/list')
    async getSessions(event: AuthenticatedALBEvent): Promise<ALBResult> {
        // Parse and validate request data
        const { params, body } = this.parseRequest(event, GetSessionsSchema);
        const { userId } = params;
        const { pagingInstruction } = body;

        // Get authenticated user and check authorization
        const user = event.authContext.identity;
        this.requireRole(user, Role.Support, {
            allowOwner: true,
            resourceUserId: userId
        });
        
        const sessions = await this.sessionRepository.getSessions({
            userId,
            pagingInstruction
        });

        const adapter = new SessionCollectionAdapter(
            userId,
            sessions.items,
            {
                next: sessions.pagingInstructions.next,
                previous: sessions.pagingInstructions.previous,
                current: sessions.pagingInstructions.current
            }
        );

        return this.success(event, adapter);
    }


    /**
     * Delete multiple sessions
     * Example: POST /users/123/sessions/delete
     * Requires session authentication (no API key access)
     */
    @Log()
    @Protected()
    @Route('POST', '/users/{userId}/sessions/delete')
    async deleteSessions(event: AuthenticatedALBEvent): Promise<ALBResult> {
        // Parse and validate request data
        const { params, body } = this.parseRequest(event, DeleteSessionsSchema);
        const { userId } = params;
        const { sessionIds } = body;
        
        // Get authenticated user and check authorization
        const user = event.authContext.identity;
        this.requireRole(user, Role.Support, {
            allowOwner: true,
            resourceUserId: userId
        });
        
        // Require session auth for bulk deletion (sensitive operation)
        this.requireSessionAuth(event);

        await this.sessionRepository.deleteSessions({
            userId,
            sessionIds
        });

        const adapter = new SessionDeletionAdapter(userId, sessionIds.length);

        return this.success(event, adapter);
    }
}