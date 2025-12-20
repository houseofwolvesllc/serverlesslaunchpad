import { User } from "@houseofwolves/serverlesslaunchpad.core";
import { HalResourceAdapter, HalObject } from "../content_types/hal_adapter";
import { AccessAdapter, AccessContext } from "./access_adapter";

export interface AuthContext {
    identity: User;
    access: AccessContext;
}

export class AuthContextAdapter extends HalResourceAdapter {
    constructor(private authContext: AuthContext) {
        super();
    }

    get userId() {
        return this.authContext.identity.userId;
    }

    get email() {
        return this.authContext.identity.email;
    }

    get firstName() {
        return this.authContext.identity.firstName;
    }

    get lastName() {
        return this.authContext.identity.lastName;
    }

    get role() {
        return this.authContext.identity.role;
    }

    get features() {
        return this.authContext.identity.features;
    }

    get dateCreated() {
        return this.authContext.identity.dateCreated;
    }

    get dateModified() {
        return this.authContext.identity.dateModified;
    }

    get _links(): HalObject["_links"] {
        return {
            self: this.createLink(`/users/${this.userId}`),
            sessions: this.createLink(`/users/${this.userId}/sessions/`, {
                title: "Manage user sessions",
            }),
            "api-keys": this.createLink(`/users/${this.userId}/api_keys/`, {
                title: "Manage API keys",
            }),
        };
    }

    get _templates(): HalObject["_templates"] {
        return {
            verify: this.createTemplate(
                "Verify current session",
                "POST",
                "/auth/verify"
            ),
            revoke: this.createTemplate(
                "Revoke current session",
                "POST",
                "/auth/revoke"
            ),
        };
    }

    get _embedded(): HalObject["_embedded"] {
        return {
            access: new AccessAdapter(
                this.authContext.access,
                this.userId
            ),
        };
    }
}
