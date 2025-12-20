import { PagingInstructions } from "@houseofwolves/serverlesslaunchpad.commons";
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
        const selfHref = this.router.buildHref(ApiKeysController, 'getApiKeys', { userId: this.userId });

        const links: any = {
            self: this.createLink(selfHref, { title: "API Keys" }),
            ...this.getBaseLinks(),
        };

        if (this.pagingData.next) {
            links.next = this.createLink(selfHref, {
                title: "Next page",
            });
        }

        if (this.pagingData.previous) {
            links.previous = this.createLink(selfHref, {
                title: "Previous page",
            });
        }

        return links;
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
                _links: {
                    // Note: Individual API key resource doesn't have a route yet
                    // Using path template for now - add route when implementing GET /users/{userId}/api-keys/{apiKeyId}
                    self: this.createLink(`/users/${this.userId}/api-keys/${apiKey.apiKeyId}`),
                },
                _templates: {
                    delete: this.createTemplate(
                        "Delete API Key",
                        "DELETE",
                        this.router.buildHref(ApiKeysController, 'deleteApiKeys', { userId: this.userId }),
                        {
                            contentType: "application/json",
                            properties: [
                                this.createProperty("apiKeyIds", {
                                    prompt: "API Key ID",
                                    required: true,
                                    type: "text",
                                    value: apiKey.apiKeyId
                                })
                            ]
                        }
                    )
                }
            })),
        };
    }

    get _templates() {
        return {
            create: this.createTemplate(
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
