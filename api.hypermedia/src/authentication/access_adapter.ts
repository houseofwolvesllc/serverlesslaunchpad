import { HalResourceAdapter, HalObject } from "../content_types/hal_adapter";

export interface AccessContext {
    type: "session" | "apiKey" | "unknown";
    description?: string;
    ipAddress: string;
    userAgent: string;
    sessionToken?: string;
    dateLastAccessed?: Date;
    dateExpires?: Date;
}

export class AccessAdapter extends HalResourceAdapter {
    constructor(
        private access: AccessContext,
        private userId: string
    ) {
        super();
    }

    get type() {
        return this.access.type;
    }

    get description() {
        return this.access.description;
    }

    get ipAddress() {
        return this.access.ipAddress;
    }

    get userAgent() {
        return this.access.userAgent;
    }

    get sessionToken() {
        return this.access.sessionToken;
    }

    get dateLastAccessed() {
        return this.access.dateLastAccessed;
    }

    get dateExpires() {
        return this.access.dateExpires;
    }

    get _links(): HalObject["_links"] {
        if (this.access.type === "session" && this.access.sessionToken) {
            return this.selfLink(`/users/${this.userId}/sessions/${this.access.sessionToken}`);
        }

        return {};
    }
}
