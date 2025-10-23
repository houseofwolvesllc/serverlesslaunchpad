import { ApiKey } from "@houseofwolves/serverlesslaunchpad.core";
import { HalResourceAdapter } from "../content_types/hal_adapter";

/**
 * HAL adapter for API key collection responses
 */
export class ApiKeyCollectionAdapter extends HalResourceAdapter {
    constructor(
        private userId: string,
        private apiKeys: ApiKey[],
        private pagingData: {
            next?: string;
            previous?: string;
            current?: string;
        }
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
                name: apiKey.name,
                dateCreated: apiKey.dateCreated.toISOString(),
                dateExpires: apiKey.dateExpires?.toISOString(),
                _links: {
                    self: this.createLink(`/users/${this.userId}/api_keys/${apiKey.apiKeyId}`)
                }
            }))
        };
    }

    get paging() {
        return {
            next: this.pagingData.next,
            previous: this.pagingData.previous,
            current: this.pagingData.current
        };
    }

    get count() {
        return this.apiKeys.length;
    }
}
