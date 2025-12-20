import type { ALBEvent } from "aws-lambda";
import { getRequestContentType } from "./content_negotiation";

/**
 * Helper utilities for hypermedia link generation and request parsing
 */

export interface HypermediaLink {
    rel: string[];
    href: string;
    title?: string;
}

export interface HypermediaAction {
    name: string;
    title: string;
    method: string;
    href: string;
    type?: string;
    fields?: HypermediaField[];
}

export interface HypermediaField {
    name: string;
    type: string;
    required?: boolean;
    value?: unknown;
}

/**
 * Generate hypermedia links based on user permissions
 */
export const generateLinks = (_baseUrl: string, userId?: string): HypermediaLink[] => {
    const links: HypermediaLink[] = [
        {
            rel: ["home"],
            href: "/",
            title: "Home",
        },
    ];

    if (userId) {
        links.push(
            {
                rel: ["self"],
                href: `/users/${userId}`,
                title: "User Profile",
            },
            {
                rel: ["sessions"],
                href: `/users/${userId}/sessions/`,
                title: "Sessions",
            },
            {
                rel: ["api-keys"],
                href: `/users/${userId}/api_keys/`,
                title: "API Keys",
            }
        );
    }

    return links;
};

/**
 * Parse request body based on content type
 */
export const parseRequestBody = (event: ALBEvent): Record<string, any> => {
    if (!event.body) {
        return {};
    }
    
    const contentType = getRequestContentType(event);
    const body = event.isBase64Encoded 
        ? Buffer.from(event.body, 'base64').toString('utf-8')
        : event.body;
    
    // Parse based on content type
    if (contentType?.includes('application/json')) {
        try {
            return JSON.parse(body);
        } catch (e) {
            // Return empty object for invalid JSON - error handling should be done at higher level
            return {};
        }
    } else if (contentType?.includes('application/x-www-form-urlencoded')) {
        // Parse URL-encoded form data
        const params = new URLSearchParams(body);
        const result: Record<string, any> = {};
        
        for (const [key, value] of params) {
            // Handle array notation (e.g., items[] or items[0])
            if (key.endsWith('[]')) {
                const baseKey = key.slice(0, -2);
                if (!result[baseKey]) {
                    result[baseKey] = [];
                }
                result[baseKey].push(value);
            } else {
                result[key] = value;
            }
        }
        
        return result;
    }
    
    // Default: return empty object for unsupported content types
    return {};
};

/**
 * Merge request parameters from all sources (path, query, body)
 * Precedence: path params > query params > body params
 */
export const mergeRequestParameters = (
    pathParams: Record<string, string>,
    queryParams: Record<string, string | string[]> | null,
    bodyParams: Record<string, any>
): Record<string, any> => {
    // Start with body params (lowest precedence)
    const merged = { ...bodyParams };
    
    // Add query params (medium precedence)
    if (queryParams) {
        for (const [key, value] of Object.entries(queryParams)) {
            merged[key] = value;
        }
    }
    
    // Add path params (highest precedence)
    for (const [key, value] of Object.entries(pathParams)) {
        merged[key] = value;
    }
    
    return merged;
};