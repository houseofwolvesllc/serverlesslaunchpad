import { Session } from "@houseofwolves/serverlesslaunchpad.core";
import { PagingInstructions } from "@houseofwolves/serverlesslaunchpad.commons";
import { HalResourceAdapter } from "../content_types/hal_adapter";

/**
 * HAL adapter for session collection responses
 */
export class SessionCollectionAdapter extends HalResourceAdapter {
    constructor(
        private userId: string,
        private sessions: Session[],
        private pagingData: PagingInstructions
    ) {
        super();
    }

    get _links() {
        const links: any = {
            self: this.createLink(`/users/${this.userId}/sessions/list`),
            ...this.getBaseLinks()
        };

        if (this.pagingData.next) {
            links.next = this.createLink(`/users/${this.userId}/sessions/list`, {
                title: "Next page"
            });
        }

        if (this.pagingData.previous) {
            links.previous = this.createLink(`/users/${this.userId}/sessions/list`, {
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
                dateCreated: session.dateCreated.toISOString(),
                dateExpires: session.dateExpires.toISOString(),
                _links: {
                    self: this.createLink(`/users/${this.userId}/sessions/${session.sessionId}`)
                }
            }))
        };
    }

    get paging() {
        // Return paging instructions as-is (objects, not serialized strings)
        return this.pagingData;
    }

    get count() {
        return this.sessions.length;
    }
}
