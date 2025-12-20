import { User } from "@houseofwolves/serverlesslaunchpad.core";
import { HalResourceAdapter, HalObject } from "../content_types/hal_adapter";
import { AccessAdapter, AccessContext } from "./access_adapter";
import { Router } from "../router";
import { SessionsController } from "../sessions/sessions_controller";
import { ApiKeysController } from "../api_keys/api_keys_controller";

export interface AuthContext {
    identity: User;
    access: AccessContext;
}

export class AuthContextAdapter extends HalResourceAdapter {
    constructor(
        private authContext: AuthContext,
        private router: Router
    ) {
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
        };
    }

    get _templates(): HalObject["_templates"] {
        const templates: HalObject["_templates"] = {
            verify: this.createTemplate(
                "Verify Session",
                "POST",
                "/auth/verify"
            ),
            sessions: this.createTemplate(
                "Sessions",
                "POST",
                this.router.buildHref(SessionsController, 'getSessions', { userId: this.userId }),
                {
                    contentType: "application/json",
                    properties: [
                        this.createProperty("pagingInstruction", {
                            prompt: "Paging Instruction",
                            required: false,
                            type: "hidden"
                        })
                    ]
                }
            ),
            "api-keys": this.createTemplate(
                "API Keys",
                "POST",
                this.router.buildHref(ApiKeysController, 'getApiKeys', { userId: this.userId }),
                {
                    contentType: "application/json",
                    properties: [
                        this.createProperty("pagingInstruction", {
                            prompt: "Paging Instruction",
                            required: false,
                            type: "hidden"
                        })
                    ]
                }
            ),
        };

        // Only allow session revocation for session-based authentication
        // API keys cannot be revoked through this endpoint
        if (this.authContext.access.type === "session") {
            templates.revoke = this.createTemplate(
                "Revoke current session",
                "POST",
                "/auth/revoke"
            );
        }

        return templates;
    }

    get _embedded(): HalObject["_embedded"] {
        return {
            access: new AccessAdapter(
                this.authContext.access,
                this.userId
            ),
        };
    }

    toJSON(): HalObject {
        return {
            userId: this.userId,
            email: this.email,
            firstName: this.firstName,
            lastName: this.lastName,
            role: this.role,
            features: this.features,
            dateCreated: this.dateCreated,
            dateModified: this.dateModified,
            _links: { ...this.getBaseLinks(), ...this._links },
            _embedded: this._embedded,
            _templates: this._templates,
        };
    }
}
