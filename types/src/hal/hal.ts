/**
 * HAL (Hypertext Application Language) Type Definitions
 *
 * These types define the structure of HAL-compliant responses.
 * Used by both the hypermedia API (server) and web client.
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
