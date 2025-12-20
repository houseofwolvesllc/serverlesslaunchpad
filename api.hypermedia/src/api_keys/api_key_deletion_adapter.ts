import { HalResourceAdapter } from "../content_types/hal_adapter";

/**
 * HAL adapter for API key deletion responses
 */
export class ApiKeyDeletionAdapter extends HalResourceAdapter {
    constructor(
        private userId: string,
        private count: number
    ) {
        super();
    }

    get _links() {
        return {
            self: this.createLink(`/users/${this.userId}/api_keys/delete`),
            apiKeys: this.createLink(`/users/${this.userId}/api_keys/list`, {
                title: "View remaining API keys"
            }),
            ...this.getBaseLinks()
        };
    }

    get message() {
        return `Deleted ${this.count} API keys for user ${this.userId}`;
    }

    get deletedCount() {
        return this.count;
    }

    toJSON() {
        return {
            message: this.message,
            deletedCount: this.deletedCount,
            _links: this._links,
        };
    }
}
