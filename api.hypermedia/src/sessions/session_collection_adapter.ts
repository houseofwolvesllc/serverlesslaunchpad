import { Session } from "@houseofwolves/serverlesslaunchpad.core";
import { PagingInstructions } from "@houseofwolves/serverlesslaunchpad.commons";
import { HalResourceAdapter } from "../content_types/hal_adapter";
import { Router } from "../router";
import { SessionsController } from "./sessions_controller";

/**
 * HAL adapter for session collection responses
 *
 * Uses reverse routing via Router.buildHref() to generate URLs from route metadata.
 * This ensures adapters don't hard-code paths and stay in sync with @Route decorators.
 */
export class SessionCollectionAdapter extends HalResourceAdapter {
    constructor(
        private userId: string,
        private sessions: Session[],
        private pagingData: PagingInstructions,
        private router: Router
    ) {
        super();
    }

    get _links() {
        const selfHref = this.router.buildHref(SessionsController, 'getSessions', { userId: this.userId });

        const links: any = {
            self: this.createLink(selfHref, { title: "Sessions" }),
            ...this.getBaseLinks()
        };

        if (this.pagingData.next) {
            links.next = this.createLink(selfHref, {
                title: "Next page"
            });
        }

        if (this.pagingData.previous) {
            links.previous = this.createLink(selfHref, {
                title: "Previous page"
            });
        }

        return links;
    }

    get _embedded() {
        return {
            sessions: this.sessions.map(session => ({
                sessionId: session.sessionId,
                userId: session.userId,
                ipAddress: session.ipAddress,
                userAgent: session.userAgent,
                dateCreated: session.dateCreated.toISOString(),
                dateExpires: session.dateExpires.toISOString(),
                dateLastAccessed: session.dateLastAccessed.toISOString(),
                _links: {
                    // Note: Individual session resource doesn't have a route yet
                    // Using path template for now - add route when implementing GET /users/{userId}/sessions/{sessionId}
                    self: this.createLink(`/users/${this.userId}/sessions/${session.sessionId}`)
                }
            }))
        };
    }

    // Return cursor-based paging instructions for client navigation
    get paging() {
        return this.pagingData;
    }

    get count() {
        return this.sessions.length;
    }

    toJSON() {
        return {
            count: this.count,
            paging: this.paging,
            _links: this._links,
            _embedded: this._embedded,
        };
    }
}
