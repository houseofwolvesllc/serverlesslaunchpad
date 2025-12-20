import { FEATURES_METADATA, Role, ROLE_METADATA, User } from "@houseofwolves/serverlesslaunchpad.core";
import { ApiKeysController } from "../api_keys/api_keys_controller.js";
import { bitfieldToArray, createBitfieldProperty, createEnumProperty } from "../content_types/enum_adapter_helpers.js";
import { HalObject, HalResourceAdapter, HalTemplateProperty } from "../content_types/hal_adapter.js";
import { Router } from "../router.js";
import { SessionsController } from "../sessions/sessions_controller.js";
import { UsersController } from "./users_controller.js";

/**
 * HAL adapter for User resource
 *
 * Provides hypermedia links to related resources:
 * - self: canonical URL for this user
 * - sessions: template to list user sessions
 * - api-keys: template to list user API keys
 * - edit: template to update user profile (conditional on permissions)
 */
export class UserAdapter extends HalResourceAdapter {
    constructor(private user: User, private currentUser: User, private router: Router) {
        super();
    }

    get userId() {
        return this.user.userId;
    }

    get email() {
        return this.user.email;
    }

    get firstName() {
        return this.user.firstName;
    }

    get lastName() {
        return this.user.lastName;
    }

    get role() {
        return this.user.role;
    }

    get features() {
        return this.user.features;
    }

    get dateCreated() {
        return this.user.dateCreated;
    }

    get dateModified() {
        return this.user.dateModified;
    }

    get _links(): HalObject["_links"] {
        // Use full name as title, fallback to email if name is not available
        const fullName = `${this.firstName} ${this.lastName}`.trim();
        const title = fullName || this.email;

        return {
            self: this.createLink(
                this.router.buildHref(UsersController, "getUser", {
                    userId: this.userId,
                }),
                { title }
            ),
        };
    }

    get _templates(): HalObject["_templates"] {
        const templates: HalObject["_templates"] = {
            sessions: this.createTemplate(
                "Sessions",
                "POST",
                this.router.buildHref(SessionsController, "getSessions", {
                    userId: this.userId,
                }),
                {
                    contentType: "application/json",
                    properties: [
                        this.createProperty("pagingInstruction", {
                            prompt: "Paging Instruction",
                            required: false,
                            type: "hidden",
                        }),
                    ],
                }
            ),
            "api-keys": this.createTemplate(
                "API Keys",
                "POST",
                this.router.buildHref(ApiKeysController, "getApiKeys", {
                    userId: this.userId,
                }),
                {
                    contentType: "application/json",
                    properties: [
                        this.createProperty("pagingInstruction", {
                            prompt: "Paging Instruction",
                            required: false,
                            type: "hidden",
                        }),
                    ],
                }
            ),
        };

        // Add edit template if user has permission
        if (this.canEdit()) {
            templates.edit = this.createEditTemplate();
        }

        return templates;
    }

    /**
     * Determine if current user can edit this user resource
     */
    private canEdit(): boolean {
        // Users can edit their own profile
        if (this.currentUser.userId === this.user.userId) {
            return true;
        }

        // Admins can edit any profile
        return this.currentUser.role >= Role.AccountManager;
    }

    /**
     * Create edit template with all fields and enum metadata
     *
     * - All users see firstName, lastName, role, and features fields
     * - Role and features marked read-only for non-admin users
     * - Users cannot edit their own role (even admins)
     * - Enum metadata (options) always included for proper display
     */
    private createEditTemplate() {
        const isAdmin = this.currentUser.role >= Role.Admin;
        const isSelfEdit = this.currentUser.userId === this.user.userId;

        const properties: HalTemplateProperty[] = [
            // Base fields (all users)
            this.createProperty("firstName", {
                prompt: "First Name",
                required: true,
                type: "text",
                maxLength: 100,
                value: this.user.firstName,
            }),
            this.createProperty("lastName", {
                prompt: "Last Name",
                required: true,
                type: "text",
                maxLength: 100,
                value: this.user.lastName,
            }),
        ];

        // Always include role and features for display purposes (with enum metadata)
        // Mark as read-only based on permissions
        properties.push(
            createEnumProperty("role", ROLE_METADATA, {
                prompt: "User Role",
                required: true,
                value: this.user.role,
                // Read-only unless admin editing another user (can't edit own role)
                readOnly: !isAdmin || isSelfEdit,
            }),
            createBitfieldProperty("features", FEATURES_METADATA, {
                prompt: "Features",
                required: false,
                value: this.user.features,
                // Read-only unless admin
                readOnly: !isAdmin,
            })
        );

        // Title: "Edit Profile" when editing own profile, "Edit User" when admin edits another user
        const title = isSelfEdit ? "Edit Profile" : "Edit User";

        return this.createTemplate(
            title,
            "PUT",
            this.router.buildHref(UsersController, "updateUser", { userId: this.user.userId }),
            {
                contentType: "application/json",
                properties,
            }
        );
    }

    toJSON(): HalObject {
        return {
            userId: this.userId,
            email: this.email,
            firstName: this.firstName,
            lastName: this.lastName,
            role: this.role,
            features: bitfieldToArray(this.features, FEATURES_METADATA), // Human-readable array
            dateCreated: this.dateCreated.toISOString(),
            dateModified: this.dateModified.toISOString(),
            _links: { ...this.getBaseLinks(), ...this._links },
            _templates: this._templates,
        };
    }
}
