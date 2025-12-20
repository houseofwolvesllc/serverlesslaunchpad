/**
 * HAL (Hypertext Application Language) Type Definitions
 *
 * These types define the structure of HAL-compliant responses from the hypermedia API.
 *
 * @see https://datatracker.ietf.org/doc/html/draft-kelly-json-hal-11
 * @see https://rwcbook.github.io/hal-forms/
 */

/**
 * HAL link object
 * Represents a hyperlink to a related resource
 */
export interface HalLink {
    /** The URI of the linked resource */
    href: string;

    /** Human-readable title for the link */
    title?: string;

    /** Media type hint for the target resource */
    type?: string;

    /** Whether the href is a URI template (RFC 6570) */
    templated?: boolean;

    /** Language of the target resource (RFC 5988) */
    hreflang?: string;

    /** Name for distinguishing between multiple links with same relation */
    name?: string;

    /** Deprecation notice URL */
    deprecation?: string;

    /** Profile URL (RFC 6906) */
    profile?: string;
}

/**
 * HAL-FORMS template property
 * Defines a single property in a template
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

    /** Data type (text, number, date, email, etc.) */
    type?: string;

    /** Regular expression for validation */
    regex?: string;

    /** Minimum value (for numbers/dates) */
    min?: number | string;

    /** Maximum value (for numbers/dates) */
    max?: number | string;

    /** Minimum length (for strings) */
    minLength?: number;

    /** Maximum length (for strings) */
    maxLength?: number;

    /** Read-only property */
    readOnly?: boolean;

    /** Possible values (for select/enum) */
    options?: Array<{
        value: any;
        prompt?: string;
    }>;
}

/**
 * HAL-FORMS template for describing available actions
 * Used for forms and state-changing operations
 *
 * @see https://rwcbook.github.io/hal-forms/
 */
export interface HalTemplate {
    /** Human-readable title for the action */
    title: string;

    /** HTTP method (GET, POST, PUT, DELETE, PATCH, etc.) */
    method: string;

    /** Target URI for the action */
    target: string;

    /** Content type for request body (default: application/json) */
    contentType?: string;

    /** Properties/fields for the action */
    properties?: HalTemplateProperty[];
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
 * HAL collection type
 * Represents a collection of resources with pagination
 */
export interface HalCollection<T = any> extends HalObject {
    /** Embedded items in the collection */
    _embedded?: {
        [rel: string]: Array<T & HalObject>;
    };

    /** Total count of items in the collection */
    count?: number;

    /** Pagination metadata */
    paging?: {
        /** Token/cursor for next page */
        next?: string;

        /** Token/cursor for previous page */
        previous?: string;

        /** Token/cursor for current page */
        current?: string;

        /** Total number of items across all pages */
        total?: number;

        /** Current page number (if using offset pagination) */
        page?: number;

        /** Total number of pages (if using offset pagination) */
        pages?: number;

        /** Items per page */
        limit?: number;

        /** Current offset (if using offset pagination) */
        offset?: number;
    };
}

/**
 * HAL error response
 * Represents an error following RFC 7807 (Problem Details)
 */
export interface HalError extends HalObject {
    /** HTTP status code */
    status: number;

    /** Short, human-readable summary of the problem type */
    title: string;

    /** Human-readable explanation specific to this occurrence */
    detail?: string;

    /** URI reference that identifies the specific occurrence */
    instance?: string;

    /** Timestamp when the error occurred */
    timestamp?: string;

    /** Trace ID for debugging */
    traceId?: string;

    /** Field-level validation errors */
    violations?: Array<{
        field: string;
        message: string;
    }>;

    /** Additional error metadata */
    [key: string]: any;
}

/**
 * Type guard to check if an object is a HalObject
 */
export function isHalObject(obj: any): obj is HalObject {
    return (
        obj !== null &&
        typeof obj === 'object' &&
        (
            obj._links !== undefined ||
            obj._embedded !== undefined ||
            obj._templates !== undefined ||
            obj.constructor?.name?.endsWith('Adapter')
        )
    );
}

/**
 * Type guard to check if an object is a HalCollection
 */
export function isHalCollection<T = any>(obj: any): obj is HalCollection<T> {
    return (
        isHalObject(obj) &&
        obj._embedded !== undefined &&
        typeof obj._embedded === 'object'
    );
}

/**
 * Type guard to check if an object is a HalError
 */
export function isHalError(obj: any): obj is HalError {
    return (
        isHalObject(obj) &&
        typeof obj.status === 'number' &&
        typeof obj.title === 'string'
    );
}

/**
 * Extract a link href from a HAL object by relation
 * Returns undefined if link doesn't exist
 */
export function getLinkHref(resource: HalObject, rel: string | string[]): string | undefined {
    if (!resource._links) return undefined;

    const rels = Array.isArray(rel) ? rel : [rel];

    for (const r of rels) {
        const link = resource._links[r];
        if (link) {
            // Handle both single link and array of links
            const singleLink = Array.isArray(link) ? link[0] : link;
            return singleLink?.href;
        }
    }

    return undefined;
}

/**
 * Check if a HAL object has a specific link relation
 */
export function hasLink(resource: HalObject, rel: string | string[]): boolean {
    return getLinkHref(resource, rel) !== undefined;
}

/**
 * Get an embedded resource from a HAL object by relation
 * Returns undefined if embedded resource doesn't exist
 */
export function getEmbedded<T = any>(
    resource: HalObject,
    rel: string
): Array<T & HalObject> | (T & HalObject) | undefined {
    if (!resource._embedded) return undefined;
    return resource._embedded[rel] as Array<T & HalObject> | (T & HalObject) | undefined;
}

/**
 * Get a template from a HAL object by name
 * Returns undefined if template doesn't exist
 */
export function getTemplate(resource: HalObject, name: string): HalTemplate | undefined {
    if (!resource._templates) return undefined;
    return resource._templates[name];
}

/**
 * Check if a HAL object has a specific template (action affordance)
 */
export function hasTemplate(resource: HalObject, name: string): boolean {
    return getTemplate(resource, name) !== undefined;
}
