import { Injectable, Role, Session, SessionRepository } from "@houseofwolves/serverlesslaunchpad.core";
import { ALBResult } from "aws-lambda";
import { BaseController } from "../base_controller.js";
import { AuthenticatedALBEvent } from "../extended_alb_event.js";
import { Log, Protected } from "../decorators/index.js";
import { Route, Router } from "../router.js";
import { MessageAdapter } from "../content_types/message_adapter.js";
import { DeleteSessionsSchema, GetSessionsSchema } from "./schemas.js";
import { SessionCollectionAdapter } from "./session_collection_adapter.js";

/**
 * Sessions endpoint controller demonstrating proper decorator usage
 */
@Injectable()
export class SessionsController extends BaseController {
    constructor(
        private sessionRepository: SessionRepository,
        private router: Router
    ) {
        super();
    }

    /**
     * Get paginated list of user sessions
     * Example: POST /users/123/sessions/list
     * Body: { "pagingInstruction": { ... } }
     *
     * ETag Strategy: Uses query hash + limit + first/last session identifiers.
     * Returns 304 Not Modified if client has current version of this page.
     *
     * Decorator execution order (bottom to top):
     * 1. Protected - authenticates user and validates role/owner access
     * 2. Log - wraps entire execution
     */
    @Log()
    @Protected()
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

        // Generate ETag from collection
        const etag = this.generateSessionsListETag(
            sessions.items,
            { userId, cursor: pagingInstruction?.cursor },
            { limit: pagingInstruction?.limit ?? 50 }
        );

        // Check if client has current version
        const notModified = this.checkNotModified(event, etag);
        if (notModified) return notModified;

        // Pass paging instructions as-is (no serialization needed)
        const adapter = new SessionCollectionAdapter(
            userId,
            sessions.items,
            sessions.pagingInstructions,
            this.router
        );

        return this.success(event, adapter, {
            headers: { 'ETag': etag }
        });
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

        // Action response - no self link, use collection template (POST operation)
        const adapter = new MessageAdapter({
            message: `Deleted ${sessionIds.length} sessions for user ${userId}`,
            templates: {
                collection: {
                    title: "View Sessions",
                    method: "POST",
                    target: this.router.buildHref(SessionsController, 'getSessions', { userId }),
                    contentType: "application/json",
                    properties: [
                        {
                            name: "pagingInstruction",
                            prompt: "Paging Instruction",
                            required: false,
                            type: "hidden"
                        }
                    ]
                }
            },
            properties: {
                deletedCount: sessionIds.length
            }
        });

        return this.success(event, adapter);
    }

    /**
     * Generate ETag for a sessions list/collection.
     * Based on query params, pagination, and first/last record identifiers.
     */
    private generateSessionsListETag(
        sessions: Session[],
        query: Record<string, any>,
        pagination: { limit: number }
    ): string {
        if (sessions.length === 0) {
            const queryHash = this.simpleHash(JSON.stringify(query));
            return `"list-${queryHash}-${pagination.limit}-empty"`;
        }

        const first = sessions[0];
        const last = sessions[sessions.length - 1];
        const queryHash = this.simpleHash(JSON.stringify(query));
        const firstTs = new Date(first.dateLastAccessed).getTime();
        const lastTs = new Date(last.dateLastAccessed).getTime();

        return `"list-${queryHash}-${pagination.limit}-${first.sessionId}-${firstTs}-${last.sessionId}-${lastTs}"`;
    }
}