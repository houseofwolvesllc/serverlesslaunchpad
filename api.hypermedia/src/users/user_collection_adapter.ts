import { User } from "@houseofwolves/serverlesslaunchpad.core";
import { PagingInstructions } from "@houseofwolves/serverlesslaunchpad.types";
import { HalResourceAdapter } from "../content_types/hal_adapter";
import { Router } from "../router";
import { UsersController } from "./users_controller";
import { UserAdapter } from "./user_adapter";

/**
 * HAL adapter for users collection responses
 *
 * Unlike API Keys and Sessions, this collection has NO create or bulk-delete templates.
 * Users are created through Cognito sign-up, and bulk deletion is not permitted for security.
 *
 * This adapter showcases pure HAL/HATEOAS - the collection will be rendered by generic
 * frontend components without any custom code.
 */
export class UserCollectionAdapter extends HalResourceAdapter {
    constructor(
        private users: User[],
        private currentUser: User,
        private pagingData: PagingInstructions,
        private router: Router
    ) {
        super();
    }

    get _links() {
        // POST-only API: only include GET-able navigation links
        // Operations (self, next, prev) are in _templates only
        return {
            ...this.getBaseLinks(), // home, sitemap
        };
    }

    get _embedded() {
        return {
            users: this.users.map((user) => {
                // Use UserAdapter to get full HAL representation with links
                const adapter = new UserAdapter(user, this.currentUser, this.router);
                return adapter.toJSON();
            }),
        };
    }

    get _templates() {
        const listEndpoint = this.router.buildHref(UsersController, "getUsers", {});

        const templates: any = {
            // Self template - allows link to reference this POST operation
            self: this.createTemplate("Users", "POST", listEndpoint, {
                contentType: "application/json",
                properties: [
                    this.createProperty("pagingInstruction", {
                        prompt: "Paging Instruction",
                        required: false,
                        type: "hidden",
                    }),
                ],
            }),
            // NO create template - users created via Cognito sign-up
            // NO bulk-delete template - users are sensitive resources
        };

        // Add pagination templates when applicable
        if (this.pagingData.next) {
            templates.next = this.createTemplate("Next Page", "POST", listEndpoint, {
                contentType: "application/json",
                properties: [
                    this.createProperty("pagingInstruction", {
                        prompt: "Paging Instruction",
                        required: false,
                        type: "hidden",
                        value: JSON.stringify(this.pagingData.next),
                    }),
                ],
            });
        }

        if (this.pagingData.previous) {
            templates.prev = this.createTemplate("Previous Page", "POST", listEndpoint, {
                contentType: "application/json",
                properties: [
                    this.createProperty("pagingInstruction", {
                        prompt: "Paging Instruction",
                        required: false,
                        type: "hidden",
                        value: JSON.stringify(this.pagingData.previous),
                    }),
                ],
            });
        }

        return templates;
    }

    get paging() {
        // Return paging instructions as-is (objects, not serialized strings)
        return this.pagingData;
    }

    get count() {
        return this.users.length;
    }

    toJSON() {
        return {
            count: this.count,
            paging: this.paging,
            _links: this._links,
            _embedded: this._embedded,
            _templates: this._templates,
        };
    }
}
