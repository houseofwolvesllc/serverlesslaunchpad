import { HalResourceAdapter } from "../content_types/hal_adapter";

/**
 * HAL adapter for session deletion responses
 */
export class SessionDeletionAdapter extends HalResourceAdapter {
    constructor(
        private userId: string,
        private count: number
    ) {
        super();
    }

    get _links() {
        return {
            self: this.createLink(`/users/${this.userId}/sessions/delete`),
            sessions: this.createLink(`/users/${this.userId}/sessions/list`, {
                title: "View remaining sessions"
            }),
            ...this.getBaseLinks()
        };
    }

    get message() {
        return `Deleted ${this.count} sessions for user ${this.userId}`;
    }

    get deletedCount() {
        return this.count;
    }
}
