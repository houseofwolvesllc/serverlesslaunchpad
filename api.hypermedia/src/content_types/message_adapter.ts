import { HalResourceAdapter, HalObject } from "./hal_adapter";

/**
 * Configuration for MessageAdapter
 */
export interface MessageAdapterConfig {
    /** The self link href */
    selfHref: string;

    /** The message to display */
    message: string;

    /** Additional links beyond self and base links */
    links?: Record<string, { href: string; title?: string }>;

    /** Additional properties to include in the response */
    properties?: Record<string, any>;

    /** Whether to include base links (home, sitemap). Default: true */
    includeBaseLinks?: boolean;
}

/**
 * Generic HAL adapter for simple responses with a message and links.
 * Replaces the need for many specialized "weak" adapters that just return
 * a message with some links.
 *
 * @example
 * // Simple message response
 * new MessageAdapter({
 *   selfHref: '/auth/revoke',
 *   message: 'Session revoked successfully'
 * })
 *
 * @example
 * // With additional properties and links
 * new MessageAdapter({
 *   selfHref: '/users/123/sessions/delete',
 *   message: 'Deleted 5 sessions for user 123',
 *   links: {
 *     sessions: { href: '/users/123/sessions/list', title: 'View remaining sessions' }
 *   },
 *   properties: {
 *     deletedCount: 5
 *   }
 * })
 */
export class MessageAdapter extends HalResourceAdapter {
    [key: string]: any;

    constructor(private config: MessageAdapterConfig) {
        super();

        // Dynamically add properties as simple values (not getters)
        // This ensures JSON.stringify will serialize them
        if (config.properties) {
            for (const [key, value] of Object.entries(config.properties)) {
                this[key] = value;
            }
        }
    }

    get _links(): HalObject["_links"] {
        const links: any = {
            self: this.createLink(this.config.selfHref),
        };

        // Add custom links
        if (this.config.links) {
            for (const [rel, link] of Object.entries(this.config.links)) {
                links[rel] = this.createLink(link.href, link.title ? { title: link.title } : undefined);
            }
        }

        // Add base links unless disabled
        if (this.config.includeBaseLinks !== false) {
            Object.assign(links, this.getBaseLinks());
        }

        return links;
    }

    get message() {
        return this.config.message;
    }
}
