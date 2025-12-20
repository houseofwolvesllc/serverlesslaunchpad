import { PagingInstructions } from "@houseofwolves/serverlesslaunchpad.types";
import { ApiKey } from "@houseofwolves/serverlesslaunchpad.core";
import { HalResourceAdapter } from "../content_types/hal_adapter";
import { Router } from "../router";
import { ApiKeysController } from "./api_keys_controller";

/**
 * HAL adapter for API key collection responses
 *
 * Uses reverse routing via Router.buildHref() to generate URLs from route metadata.
 * This ensures adapters don't hard-code paths and stay in sync with @Route decorators.
 */
export class ApiKeyCollectionAdapter extends HalResourceAdapter {
    constructor(
        private userId: string,
        private apiKeys: ApiKey[],
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
            apiKeys: this.apiKeys.map((apiKey) => ({
                apiKeyId: apiKey.apiKeyId,
                userId: apiKey.userId,
                label: apiKey.label,
                apiKey: apiKey.apiKey, // Full API key
                keyPrefix: apiKey.apiKey.substring(0, 8), // First 8 chars for reference
                dateCreated: apiKey.dateCreated.toISOString(),
                dateLastAccessed: apiKey.dateLastAccessed.toISOString(),
                // No _links - all API key data is visible in collection view
                // No individual API key endpoint needed
            })),
        };
    }

    get _templates() {
        const listEndpoint = this.router.buildHref(ApiKeysController, 'getApiKeys', { userId: this.userId });

        const templates: any = {
            // Self template - allows link to reference this POST operation
            self: this.createTemplate(
                "API Keys",
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
            default: this.createTemplate(
                "Create API Key",
                "POST",
                this.router.buildHref(ApiKeysController, 'createApiKey', { userId: this.userId }),
                {
                    contentType: "application/json",
                    properties: [
                        this.createProperty("label", {
                            prompt: "API Key Label",
                            required: true,
                            type: "text"
                        })
                    ]
                }
            ),
            bulkDelete: this.createTemplate(
                "Delete Selected API Keys",
                "DELETE",
                this.router.buildHref(ApiKeysController, 'deleteApiKeys', { userId: this.userId }),
                {
                    contentType: "application/json",
                    properties: [
                        this.createProperty("apiKeyIds", {
                            prompt: "API Key IDs",
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

    get paging() {
        // Return paging instructions as-is (objects, not serialized strings)
        return this.pagingData;
    }

    get count() {
        return this.apiKeys.length;
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
