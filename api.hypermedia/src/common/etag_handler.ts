import type { ALBEvent } from "aws-lambda";

/**
 * ETag handling utilities for caching
 */

export interface ETagOptions {
    ttl?: number;
    vary?: string[];
}

/**
 * Generate ETag for entity
 */
export const generateEntityETag = (version: number, lastModified: Date): string => {
    return `"v${version}-${lastModified.getTime()}"`;
};

/**
 * Generate ETag for collection
 */
export const generateCollectionETag = (count: number, maxLastModified: Date, pageToken?: string): string => {
    const tokenPart = pageToken ? `-${pageToken}` : "";
    return `"c${count}-${maxLastModified.getTime()}${tokenPart}"`;
};

/**
 * Check if request has matching ETag
 */
export const checkIfNoneMatch = (event: ALBEvent, etag: string): boolean => {
    const ifNoneMatch = event.headers?.["if-none-match"] || event.headers?.["If-None-Match"];
    return ifNoneMatch === etag;
};

/**
 * Check if request has non-matching ETag
 */
export const checkIfMatch = (event: ALBEvent, etag: string): boolean => {
    const ifMatch = event.headers?.["if-match"] || event.headers?.["If-Match"];
    return ifMatch !== undefined && ifMatch !== etag;
};