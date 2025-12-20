import { Session } from "@houseofwolves/serverlesslaunchpad.core";
import { PagingInstructions } from "@houseofwolves/serverlesslaunchpad.types";
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
        // POST-only API: only include GET-able navigation links
        // Operations (self, next, prev) are in _templates only
        return {
            ...this.getBaseLinks() // home, sitemap
        };
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
                // No _links - all session data is visible in collection view
                // No individual session endpoint needed
            }))
        };
    }

    get _templates() {
        const listEndpoint = this.router.buildHref(SessionsController, 'getSessions', { userId: this.userId });

        const templates: any = {
            // Self template - allows link to reference this POST operation
            self: this.createTemplate(
                "Sessions",
                "POST",
                listEndpoint,
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
            // Sessions collection has bulk delete but no create operation
            "bulk-delete": this.createTemplate(
                "Delete Selected Sessions",
                "DELETE",
                this.router.buildHref(SessionsController, 'deleteSessions', { userId: this.userId }),
                {
                    contentType: "application/json",
                    properties: [
                        this.createProperty("sessionIds", {
                            prompt: "Session IDs",
                            required: true,
                            type: "array",
                            value: []
                        })
                    ]
                }
            )
        };

        // Add pagination templates when applicable

        if (this.pagingData.next) {
            templates.next = this.createTemplate(
                "Next Page",
                "POST",
                listEndpoint,
                {
                    contentType: "application/json",
                    properties: [
                        this.createProperty("pagingInstruction", {
                            prompt: "Paging Instruction",
                            required: false,
                            type: "hidden",
                            value: JSON.stringify(this.pagingData.next)
                        })
                    ]
                }
            );
        }

        if (this.pagingData.previous) {
            templates.prev = this.createTemplate(
                "Previous Page",
                "POST",
                listEndpoint,
                {
                    contentType: "application/json",
                    properties: [
                        this.createProperty("pagingInstruction", {
                            prompt: "Paging Instruction",
                            required: false,
                            type: "hidden",
                            value: JSON.stringify(this.pagingData.previous)
                        })
                    ]
                }
            );
        }

        return templates;
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
            _templates: this._templates,
        };
    }
}
