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
            })),
        };
    }

    get paging() {
        // Return paging instructions as-is (objects, not serialized strings)
        return this.pagingData;
    }

    get count() {
        return this.apiKeys.length;
    }
}
