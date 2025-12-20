import { HalResourceAdapter, HalObject } from "./hal_adapter";

/**
 * Configuration for MessageAdapter
 */
export interface MessageAdapterConfig {
    /** The self link href (optional - only for resource messages, not action responses) */
    selfHref?: string;

    /** The message to display */
    message: string;

    /** Additional links beyond self and base links */
    links?: Record<string, { href: string; title?: string }>;

    /** HAL-FORMS templates for POST operations */
    templates?: Record<string, any>;

    /** Additional properties to include in the response */
    properties?: Record<string, any>;

    /** Whether to include base links (home, sitemap). Default: true for resources, false for actions */
    includeBaseLinks?: boolean;
}

/**
 * Generic HAL adapter for simple responses with a message and links.
 * Replaces the need for many specialized "weak" adapters that just return
 * a message with some links.
 *
 * Supports two patterns:
 * 1. **Resource messages**: Include selfHref (for idempotent GET-able resources)
 * 2. **Action responses**: No selfHref (for non-idempotent actions like DELETE/CREATE)
 *
 * @example
 * // Action response (no self link)
 * new MessageAdapter({
 *   message: 'Deleted 3 API keys',
 *   links: {
 *     collection: { href: '/users/123/api-keys/list', title: 'API Keys' }
 *   },
 *   properties: { deletedCount: 3 }
 * })
 *
 * @example
 * // Resource message (with self link)
 * new MessageAdapter({
 *   selfHref: '/users/123/profile/update',
 *   message: 'Profile updated successfully',
 *   links: {
 *     collection: { href: '/users/123', title: 'User' }
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
        const links: any = {};

        // Add self link only if provided (for resource messages)
        if (this.config.selfHref) {
            links.self = this.createLink(this.config.selfHref);
        }

        // Add custom links
        if (this.config.links) {
            for (const [rel, link] of Object.entries(this.config.links)) {
                links[rel] = this.createLink(link.href, link.title ? { title: link.title } : undefined);
            }
        }

        // Add base links for resources (when selfHref present), unless explicitly disabled
        // For action responses (no selfHref), don't include base links by default
        const shouldIncludeBaseLinks = this.config.includeBaseLinks !== undefined
            ? this.config.includeBaseLinks
            : !!this.config.selfHref;

        if (shouldIncludeBaseLinks) {
            Object.assign(links, this.getBaseLinks());
        }

        return links;
    }

    get _templates(): HalObject["_templates"] {
        return this.config.templates;
    }

    get message() {
        return this.config.message;
    }

    toJSON(): HalObject {
        const result: HalObject = {
            message: this.message,
            _links: this._links,
        };

        // Include templates if provided
        if (this.config.templates) {
            result._templates = this._templates;
        }

        // Include dynamically assigned properties (from config.properties)
        for (const key of Object.keys(this)) {
            if (!key.startsWith('_') && key !== 'config') {
                result[key] = (this as any)[key];
            }
        }

        return result;
    }
}
