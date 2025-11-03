/**
 * HAL (Hypertext Application Language) adapter base class
 *
 * This module provides the HalResourceAdapter base class for creating HAL resources.
 * Type definitions are imported from the centralized types package.
 *
 * @see https://datatracker.ietf.org/doc/html/draft-kelly-json-hal-11
 */

import type {
    HalLink,
    HalTemplate,
    HalTemplateProperty,
    HalObject
} from '@houseofwolves/serverlesslaunchpad.types';

// Re-export types for backward compatibility
export type { HalLink, HalTemplate, HalTemplateProperty, HalObject };

/**
 * Abstract base class for HAL resource adapters
 *
 * Adapters wrap domain objects and expose them as HAL-structured objects.
 * Properties are implemented as getters for lazy evaluation and composability.
 *
 * @example
 * ```typescript
 * class UserAdapter extends HalResourceAdapter {
 *   constructor(private user: User) {
 *     super();
 *   }
 *
 *   get userId() { return this.user.userId; }
 *   get email() { return this.user.email; }
 *
 *   get _links() {
 *     return {
 *       self: this.createLink(`/users/${this.userId}`)
 *     };
 *   }
 * }
 *
 * const adapter = new UserAdapter(user);
 * ```
 */
export abstract class HalResourceAdapter implements HalObject {

    abstract get _links(): HalObject["_links"];

    get _embedded(): HalObject["_embedded"] {
        return undefined;
    }

    get _templates(): HalObject["_templates"] {
        return undefined;
    }

    [key: string]: any;

    protected createLink(
        href: string,
        options?: Omit<HalLink, "href">
    ): HalLink {
        return {
            href,
            ...options,
        };
    }

    /**
     * Create a collection link with title (IANA standard link relation)
     *
     * Helper method for creating standard 'collection' link relations as per
     * IANA registry and HAL best practices. All collection links should include
     * a human-readable title for better API documentation.
     *
     * @param href - URL to the collection resource
     * @param title - Human-readable collection name (e.g., "API Keys", "Sessions")
     * @param options - Additional link options (type, templated, etc.)
     * @returns HAL link object
     *
     * @example
     * ```typescript
     * // In an adapter
     * get _links() {
     *   return {
     *     self: this.createLink('/users/123/api-keys/abc'),
     *     collection: this.createCollectionLink('/users/123/api-keys/list', 'API Keys')
     *   };
     * }
     * ```
     */
    protected createCollectionLink(
        href: string,
        title: string,
        options?: Omit<HalLink, "href" | "title">
    ): HalLink {
        return this.createLink(href, {
            title,
            type: options?.type || 'application/hal+json',
            ...options
        });
    }

    protected createTemplate(
        title: string,
        method: string,
        target: string,
        options?: Omit<HalTemplate, "title" | "method" | "target">
    ): HalTemplate {
        return {
            title,
            method,
            target,
            ...options,
        };
    }

    protected createProperty(
        name: string,
        options?: Omit<HalTemplateProperty, "name">
    ): HalTemplateProperty {
        return {
            name,
            ...options,
        };
    }

    protected selfLink(href: string): { self: HalLink } {
        return {
            self: this.createLink(href),
        };
    }

    protected getBaseLinks(): Record<string, HalLink> | undefined {
        return {
            home: this.createLink("/", { title: "API Root" }),
            sitemap: this.createLink("/sitemap", { title: "API Navigation" })
        };
    }

    /**
     * Serialize the adapter to a HAL-compliant JSON object.
     *
     * Each adapter must explicitly implement this method to control
     * which properties are serialized, preventing accidental leakage
     * of private constructor parameters.
     *
     * @returns HAL-formatted object ready for JSON.stringify()
     */
    abstract toJSON(): HalObject;
}
