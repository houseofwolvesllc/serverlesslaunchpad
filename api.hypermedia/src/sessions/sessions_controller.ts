import { Injectable, Role, SessionRepository } from "@houseofwolves/serverlesslaunchpad.core";
import { BaseController } from "../base_controller.js";
import { AuthenticatedALBEvent } from "../common/extended_alb_event.js";
import { HypermediaResponse } from "../common/types.js";
import { Cache, Protected } from "../decorators/index.js";
import { Route } from "../router.js";
import { DeleteSessionsSchema, GetSessionsSchema } from "./schemas.js";

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
    @Protected()
    @Cache({ ttl: 300, vary: ['Authorization'] })
    @Route('POST', '/users/{userId}/sessions/list')
    async getSessions(event: AuthenticatedALBEvent): Promise<HypermediaResponse> {
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
        
        // Return mock session data for now
        return this.success({
            sessions: sessions.items,
            paging: {
                next: sessions.pagingInstructions.next,
                previous: sessions.pagingInstructions.previous,
                current: sessions.pagingInstructions.current
            }
        });
    }


    /**
     * Delete multiple sessions
     * Example: POST /users/123/sessions/delete
     * Requires session authentication (no API key access)
     */
    @Protected()
    @Route('POST', '/users/{userId}/sessions/delete')
    async deleteSessions(event: AuthenticatedALBEvent): Promise<HypermediaResponse> {
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
        
        return this.success({ 
            message: `Deleted ${sessionIds.length} sessions for user ${userId}`,
            deletedCount: sessionIds.length
        });
    }
}