import { HalObject, HalResourceAdapter } from "../content_types/hal_adapter";

export interface AccessContext {
    type: "session" | "apiKey" | "unknown";
    description?: string;
    ipAddress: string;
    userAgent: string;
    sessionId?: string;
    dateLastAccessed?: Date;
    dateExpires?: Date;
}

export class AccessAdapter extends HalResourceAdapter {
    constructor(private access: AccessContext) {
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

    get sessionId() {
        return this.access.sessionId;
    }

    get dateLastAccessed() {
        return this.access.dateLastAccessed;
    }

    get dateExpires() {
        return this.access.dateExpires;
    }

    get _links(): HalObject["_links"] {
        return {};
    }

    toJSON(): HalObject {
        const result: HalObject = {
            type: this.type,
            ipAddress: this.ipAddress,
            userAgent: this.userAgent,
        };

        // Optional properties
        if (this.description !== undefined) {
            result.description = this.description;
        }
        if (this.sessionId !== undefined) {
            result.sessionId = this.sessionId;
        }
        if (this.dateLastAccessed !== undefined) {
            result.dateLastAccessed = this.dateLastAccessed;
        }
        if (this.dateExpires !== undefined) {
            result.dateExpires = this.dateExpires;
        }

        // Add links (embedded resources don't include base links)
        const links = this._links;
        if (links && Object.keys(links).length > 0) {
            result._links = { ...this.getBaseLinks(), ...links };
        }

        return result;
    }
}
