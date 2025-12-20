import { BaseController } from "../base_controller.js";
import { Route } from "../router.js";
import { Protected, Cache } from "../decorators/index.js";
import { Role } from "@houseofwolves/serverlesslaunchpad.core";
import { AuthenticatedALBEvent } from "../common/extended_alb_event.js";
import { GetSessionsSchema, DeleteSessionsSchema } from "./schemas.js";
import { HypermediaResponse } from "../common/types.js";

/**
 * Sessions endpoint controller demonstrating proper decorator usage
 */
export class SessionsController extends BaseController {
    /**
     * Get paginated list of user sessions
     * Example: GET /users/123/sessions
     * 
     * Decorator execution order (bottom to top):
     * 1. Cache - checks ETag first
     * 2. Protected - authenticates user and validates role/owner access
     * 3. Log - wraps entire execution
     */
    @Protected()
    @Cache({ ttl: 300, vary: ['Authorization'] })
    @Route('GET', '/users/{userId}/sessions')
    async getSessions(event: AuthenticatedALBEvent): Promise<HypermediaResponse> {
        // Parse and validate request data
        const { params, query } = this.parseRequest(event, GetSessionsSchema);
        const { userId } = params;
        const { limit, cursor } = query;

        // Get authenticated user and check authorization
        const user = event.authContext.identity;
        this.requireRole(user, Role.Support, {
            allowOwner: true,
            resourceUserId: userId
        });
        
        // TODO: Implement actual session retrieval
        // const sessions = await this.sessionRepository.findByUserId(userId, { limit, cursor });
        
        // Return mock session data for now
        return this.success({
            sessions: [],
            pagination: {
                limit,
                cursor,
                hasMore: false
            }
        });
    }

    /**
     * Get specific session details
     * Example: GET /users/123/sessions/456
     */
    @Protected()
    @Cache({ ttl: 600 })
    @Route('GET', '/users/{userId}/sessions/{sessionId}')
    async getSessionById(event: AuthenticatedALBEvent): Promise<HypermediaResponse> {
        // Parse and validate parameters
        const { userId, sessionId } = this.getPathParams(event);
        
        // Get authenticated user and check authorization
        const user = event.authContext.identity;
        this.requireRole(user, Role.Support, {
            allowOwner: true,
            resourceUserId: userId
        });
        
        // TODO: Implement single session retrieval
        // const session = await this.sessionRepository.findById(sessionId);
        
        // Return mock session data for now
        return this.success({ 
            sessionId,
            userId,
            createdAt: new Date().toISOString(),
            lastAccessedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 86400000).toISOString() // 24 hours
        });
    }

    /**
     * Delete a specific session
     * Example: DELETE /users/123/sessions/456
     * Note: No caching for destructive operations
     */
    @Protected()
    @Route('DELETE', '/users/{userId}/sessions/{sessionId}')
    async deleteSession(event: AuthenticatedALBEvent): Promise<HypermediaResponse> {
        // Parse parameters
        const { userId, sessionId } = this.getPathParams(event);
        
        // Get authenticated user and check authorization
        const user = event.authContext.identity;
        this.requireRole(user, Role.Support, {
            allowOwner: true,
            resourceUserId: userId
        });
        
        // TODO: Implement session deletion
        // Note: Logging is handled by @Log decorator
        return this.noContent();
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

        // TODO: Implement multiple session deletion
        return this.success({ 
            message: `Deleted ${sessionIds.length} sessions for user ${userId}`,
            deletedCount: sessionIds.length
        });
    }
}