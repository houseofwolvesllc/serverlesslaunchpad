/**
 * HAL utility functions
 * Type guards and helper functions for working with HAL objects
 */

import { HalObject, HalTemplate, HalError } from './hal.js';
import { HalCollection } from './hal_collection.js';

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
