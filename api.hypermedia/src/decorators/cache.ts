import crypto from 'crypto';
import { ALBResult } from "aws-lambda";

export interface CacheOptions {
    ttl?: number; // Time to live in seconds
    vary?: string[]; // Additional headers to vary cache on
}

interface CacheEntry {
    etag: string;
    response: any;
    timestamp: number;
}

// Simple in-memory cache for ETags (consider Redis for production)
const etagCache = new Map<string, CacheEntry>();

/**
 * Cache decorator that handles ETag generation and conditional requests.
 * Supports If-None-Match for GET requests (304 responses).
 * 
 * Example:
 * @Cache({ ttl: 300, vary: ['Authorization'] })
 */
export function Cache(options: CacheOptions = {}) {
    const { ttl = 300, vary = [] } = options;

    return function (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const request = args[0];
            const event = request._event;

            // Only cache GET requests
            if (event.httpMethod !== 'GET') {
                return originalMethod.apply(this, args);
            }

            // Build cache key from URL and vary headers
            const cacheKey = buildCacheKey(event.path, event.queryStringParameters, vary, event.headers);
            
            // Check if client sent If-None-Match header
            const ifNoneMatch = event.headers?.['if-none-match'];
            
            // Check cache
            const cached = etagCache.get(cacheKey);
            if (cached) {
                const age = (Date.now() - cached.timestamp) / 1000;
                
                // If cache is still fresh
                if (age < ttl) {
                    // Check if ETag matches (client has current version)
                    if (ifNoneMatch && ifNoneMatch === cached.etag) {
                        // Return 304 Not Modified
                        return {
                            statusCode: 304,
                            headers: {
                                'ETag': cached.etag,
                                'Cache-Control': `private, max-age=${ttl}, must-revalidate`,
                            },
                            body: ''
                        } as ALBResult;
                    }
                    
                    // Return cached response with ETag
                    return {
                        ...cached.response,
                        headers: {
                            ...cached.response.headers,
                            'ETag': cached.etag,
                            'Cache-Control': `private, max-age=${ttl}, must-revalidate`,
                            'X-Cache': 'HIT'
                        }
                    };
                }
                
                // Cache expired, remove it
                etagCache.delete(cacheKey);
            }

            // Execute the original method
            const response = await originalMethod.apply(this, args);

            // Generate ETag for successful responses
            if (response.statusCode >= 200 && response.statusCode < 300) {
                const etag = generateETag(response.body);
                
                // Store in cache
                etagCache.set(cacheKey, {
                    etag,
                    response,
                    timestamp: Date.now()
                });

                // Add cache headers
                response.headers = {
                    ...response.headers,
                    'ETag': etag,
                    'Cache-Control': `private, max-age=${ttl}, must-revalidate`,
                    'X-Cache': 'MISS'
                };
            }

            return response;
        };

        return descriptor;
    };
}

/**
 * Build a cache key from request parameters
 */
function buildCacheKey(
    path: string, 
    queryParams: Record<string, string> | null,
    varyHeaders: string[],
    headers: Record<string, string>
): string {
    const parts = [path];
    
    // Add query parameters
    if (queryParams) {
        const sortedParams = Object.entries(queryParams)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}=${v}`)
            .join('&');
        parts.push(sortedParams);
    }
    
    // Add vary headers
    for (const header of varyHeaders) {
        const value = headers[header.toLowerCase()] || '';
        parts.push(`${header}:${value}`);
    }
    
    return parts.join('|');
}

/**
 * Generate an ETag from response body
 */
function generateETag(body: string): string {
    const hash = crypto.createHash('md5').update(body).digest('hex');
    return `"${hash}"`;
}

/**
 * Clean up expired cache entries periodically
 */
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of etagCache.entries()) {
        if (now - entry.timestamp > 3600000) { // 1 hour
            etagCache.delete(key);
        }
    }
}, 300000); // Run every 5 minutes