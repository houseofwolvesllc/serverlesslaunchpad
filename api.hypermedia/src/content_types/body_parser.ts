import qs from 'qs';
import { ExtendedALBEvent } from '../extended_alb_event';

/**
 * Parsed body result with metadata
 */
export interface ParsedBody {
    data: Record<string, any>;
    contentType: string;
    method?: string; // Original or overridden method
}

/**
 * Parse request body based on Content-Type header
 *
 * Supports:
 * - application/json
 * - application/x-www-form-urlencoded
 * - multipart/form-data (future)
 *
 * Extracts _method field for HTTP method override (DELETE, PUT via POST)
 */
export function parseRequestBody(
    event: ExtendedALBEvent
): ParsedBody {
    const contentType = getContentType(event);
    let body = event.body || '';
    let data: Record<string, any> = {};
    let methodOverride: string | undefined;

    if (!body) {
        return {
            data: {},
            contentType,
        };
    }

    // Parse based on content type
    if (contentType === 'application/x-www-form-urlencoded') {
        // Check if body is already JSON (happens in dev server where Express pre-parses then stringifies)
        if (body.startsWith('{') || body.startsWith('[')) {
            try {
                data = JSON.parse(body);
            } catch {
                // Not JSON, parse as form-encoded
                data = qs.parse(body) as Record<string, any>;
            }
        } else {
            // Parse form-encoded data
            data = qs.parse(body) as Record<string, any>;
        }

        // Extract method override if present
        if (typeof data._method === 'string') {
            methodOverride = data._method.toLowerCase();
            delete data._method;
        }
    } else {
        // Default: Parse as JSON
        try {
            data = JSON.parse(body);

            // Extract method override from JSON body if present
            if (typeof data._method === 'string') {
                methodOverride = data._method.toLowerCase();
                delete data._method;
            }
        } catch (error) {
            // If not JSON, treat as plain text
            data = { body };
        }
    }

    return {
        data,
        contentType,
        method: methodOverride,
    };
}

/**
 * Get content type from request headers
 * Returns normalized base content type (without charset, boundary, etc.)
 */
export function getContentType(event: ExtendedALBEvent): string {
    const contentType = event.headers?.['content-type'] ||
                       event.headers?.['Content-Type'] ||
                       'application/json';

    // Extract base content type (ignore charset, boundary, etc.)
    return contentType.split(';')[0].trim().toLowerCase();
}
