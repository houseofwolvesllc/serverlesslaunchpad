import type { ALBEvent } from "aws-lambda";

/**
 * Supported content types for responses
 */
export const CONTENT_TYPES = {
    HAL_JSON: "application/hal+json",
    JSON: "application/json",
    XHTML: "application/xhtml+xml",
    HTML: "text/html",
} as const;

export type ContentType = typeof CONTENT_TYPES[keyof typeof CONTENT_TYPES];

/**
 * Content negotiation utilities for handling Accept headers
 */
export const getAcceptedContentType = (event: ALBEvent): ContentType => {
    const acceptHeader = event.headers?.["accept"] || event.headers?.["Accept"];
    
    // No Accept header or generic browser Accept header - default to XHTML
    if (!acceptHeader || acceptHeader === "*/*" || acceptHeader.includes("text/html")) {
        return CONTENT_TYPES.XHTML;
    }
    
    // Parse Accept header and find first supported type
    const acceptTypes = parseAcceptHeader(acceptHeader);
    
    for (const acceptType of acceptTypes) {
        // Check for HAL+JSON (preferred for hypermedia clients)
        if (acceptType.type === "application/hal+json") {
            return CONTENT_TYPES.HAL_JSON;
        }

        // Check for JSON
        if (acceptType.type === "application/json" ||
            acceptType.type === "application/*" ||
            acceptType.type === "*/*") {
            return CONTENT_TYPES.JSON;
        }

        // Check for XHTML
        if (acceptType.type === "application/xhtml+xml" ||
            acceptType.type === "application/xml") {
            return CONTENT_TYPES.XHTML;
        }
    }
    
    // Default to XHTML for unsupported types
    return CONTENT_TYPES.XHTML;
};

/**
 * Parse Accept header value into ordered list of media types
 * @param acceptHeader Raw Accept header value
 * @returns Ordered list of media types with quality values
 */
function parseAcceptHeader(acceptHeader: string): Array<{ type: string; quality: number }> {
    const types = acceptHeader.split(",").map(type => {
        const parts = type.trim().split(";");
        const mediaType = parts[0].trim();
        
        // Extract quality value if present
        let quality = 1.0;
        const qParam = parts.find(p => p.trim().startsWith("q="));
        if (qParam) {
            const qValue = parseFloat(qParam.trim().substring(2));
            if (!isNaN(qValue)) {
                quality = qValue;
            }
        }
        
        return { type: mediaType, quality };
    });
    
    // Sort by quality value (highest first)
    return types.sort((a, b) => b.quality - a.quality);
}

/**
 * Get the content type from a request (for parsing request bodies)
 */
export const getRequestContentType = (event: ALBEvent): string | undefined => {
    return event.headers?.["content-type"] || event.headers?.["Content-Type"];
};