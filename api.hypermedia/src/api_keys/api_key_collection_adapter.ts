import { ApiKey } from "@houseofwolves/serverlesslaunchpad.core";
import { PagingInstructions } from "@houseofwolves/serverlesslaunchpad.commons";
import { HalResourceAdapter } from "../content_types/hal_adapter";

/**
 * HAL adapter for API key collection responses
 */
export class ApiKeyCollectionAdapter extends HalResourceAdapter {
    constructor(
        private userId: string,
        private apiKeys: ApiKey[],
        private pagingData: PagingInstructions
    ) {
        super();
    }

    get _links() {
        const links: any = {
            self: this.createLink(`/users/${this.userId}/api_keys/list`),
            ...this.getBaseLinks()
        };

        if (this.pagingData.next) {
            links.next = this.createLink(`/users/${this.userId}/api_keys/list`, {
                title: "Next page"
            });
        }

        if (this.pagingData.previous) {
            links.previous = this.createLink(`/users/${this.userId}/api_keys/list`, {
                title: "Previous page"
            });
        }

        return links;
    }

    get _embedded() {
        return {
            apiKeys: this.apiKeys.map(apiKey => ({
                apiKeyId: apiKey.apiKeyId,
                userId: apiKey.userId,
                label: apiKey.label,
                apiKey: apiKey.apiKey, // Full API key
                keyPrefix: apiKey.apiKey.substring(0, 8), // First 8 chars for reference
                dateCreated: apiKey.dateCreated.toISOString(),
                dateLastAccessed: apiKey.dateLastAccessed.toISOString(),
                _links: {
                    self: this.createLink(`/users/${this.userId}/api_keys/${apiKey.apiKeyId}`)
                }
            }))
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
