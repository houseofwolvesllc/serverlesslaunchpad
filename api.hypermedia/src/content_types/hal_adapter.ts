/**
 * HAL (Hypertext Application Language) type definitions
 * @see https://datatracker.ietf.org/doc/html/draft-kelly-json-hal-11
 */

/**
 * HAL link object
 */
export interface HalLink {
    /** The URI of the linked resource */
    href: string;
    /** Human-readable title for the link */
    title?: string;
    /** Media type hint */
    type?: string;
    /** Whether the href is a URI template (RFC 6570) */
    templated?: boolean;
    /** Language of the target resource */
    hreflang?: string;
    /** Name for distinguishing between multiple links with same relation */
    name?: string;
}

/**
 * HAL-FORMS template for describing available actions
 * @see https://rwcbook.github.io/hal-forms/
 */
export interface HalTemplate {
    /** Human-readable title for the action */
    title: string;
    /** HTTP method (GET, POST, PUT, DELETE, PATCH, etc.) */
    method: string;
    /** Target URI for the action */
    target: string;
    /** Optional content type for request body */
    contentType?: string;
    /** Optional properties/fields for the action */
    properties?: HalTemplateProperty[];
}

/**
 * Property definition for HAL-FORMS template
 */
export interface HalTemplateProperty {
    /** Property name */
    name: string;
    /** Human-readable prompt */
    prompt?: string;
    /** Whether the property is required */
    required?: boolean;
    /** Default or current value */
    value?: any;
    /** Data type (text, number, date, etc.) */
    type?: string;
    /** Regular expression for validation */
    regex?: string;
    /** Minimum value (for numbers/dates) */
    min?: number | string;
    /** Maximum value (for numbers/dates) */
    max?: number | string;
}

/**
 * HAL object structure
 * Represents a resource with hypermedia controls
 */
export interface HalObject {
    /** Reserved: Hypermedia links */
    _links?: {
        [rel: string]: HalLink | HalLink[];
    };

    /** Reserved: Embedded resources */
    _embedded?: {
        [rel: string]: HalObject | HalObject[];
    };

    /** Reserved: Available actions (HAL-FORMS extension) */
    _templates?: {
        [name: string]: HalTemplate;
    };

    /** Resource properties (any additional fields) */
    [key: string]: any;
}

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
            home: this.createLink("/", { title: "API Home" }),
            sitemap: this.createLink("/sitemap", { title: "Navigation" })
        };
    }

    toJSON(): HalObject {
        const result: HalObject = {};

        // First, add prototype getters (like _links, _embedded, message, etc.)
        const proto = Object.getPrototypeOf(this);
        const descriptors = Object.getOwnPropertyDescriptors(proto);

        for (const [key, descriptor] of Object.entries(descriptors)) {
            if (descriptor.get && key !== "constructor") {
                const value = (this as any)[key];
                if (value !== undefined) {
                    result[key] = value;
                }
            }
        }

        // Second, add instance properties (like dynamically added properties in MessageAdapter)
        const ownKeys = Object.keys(this);
        for (const key of ownKeys) {
            // Skip private properties (starting with _ or containing "config")
            if (!key.startsWith('_') && key !== 'config' && !key.startsWith('private')) {
                const value = (this as any)[key];
                if (value !== undefined && !result.hasOwnProperty(key)) {
                    result[key] = value;
                }
            }
        }

        // Automatically inject base navigation links
        const baseLinks = this.getBaseLinks();
        if (result._links && baseLinks) {
            result._links = {
                ...baseLinks,
                ...result._links  // Context links override base links
            };
        }

        return result;
    }
}
