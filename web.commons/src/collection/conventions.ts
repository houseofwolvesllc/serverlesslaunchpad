/**
 * Collection Inference Conventions
 *
 * Default naming conventions for automatic field type detection.
 * These patterns are used to infer how fields should be rendered based on their names.
 */

import type { FieldConventions } from './types';

/**
 * Default field naming conventions
 *
 * These patterns match common naming conventions in REST APIs and databases.
 */
export const DEFAULT_CONVENTIONS: FieldConventions = {
    /**
     * Date field patterns
     * Matches: createdAt, updated_at, dateCreated, expiresOn, timestamp, etc.
     */
    datePatterns: [
        /^date/i,
        /date$/i,
        /^created/i,
        /^updated/i,
        /^modified/i,
        /^expires/i,
        /^deleted/i,
        /timestamp$/i,
        /_at$/i,
        /_on$/i,
    ],

    /**
     * Code/technical field patterns
     * Matches: id, userId, apiKey, token, hash, uuid, etc.
     */
    codePatterns: [
        /^id$/i,
        /id$/i,
        /^uuid$/i,
        /^key$/i,
        /key$/i,
        /^token$/i,
        /token$/i,
        /^hash$/i,
        /hash$/i,
        /^code$/i,
        /^api/i,
    ],

    /**
     * Badge/status field patterns
     * Matches: status, state, type, role, level, priority, etc.
     */
    badgePatterns: [
        /^status$/i,
        /^state$/i,
        /^type$/i,
        /^role$/i,
        /^level$/i,
        /^priority$/i,
        /^category$/i,
        /^tag$/i,
        /^badge$/i,
    ],

    /**
     * URL field patterns
     * Matches: url, link, href, website, etc.
     */
    urlPatterns: [
        /^url$/i,
        /url$/i,
        /^link$/i,
        /link$/i,
        /^href$/i,
        /href$/i,
        /^website$/i,
        /^homepage$/i,
    ],

    /**
     * Email field patterns
     * Matches: email, emailAddress, contactEmail, etc.
     */
    emailPatterns: [
        /^email$/i,
        /email$/i,
        /^mail$/i,
        /mail$/i,
    ],

    /**
     * Hidden field patterns
     * Matches: password, secret, internal fields, _metadata, etc.
     */
    hiddenPatterns: [
        /^_/,              // Internal/metadata fields starting with underscore
        /^password$/i,
        /password$/i,
        /^secret$/i,
        /secret$/i,
        /secret.*token/i,  // Secret tokens
        /auth.*token/i,    // Auth tokens
        /^salt$/i,
        /^password.*hash$/i, // Password hashes
    ],

    /**
     * Boolean field patterns
     * Matches: isActive, enabled, hasAccess, canEdit, etc.
     */
    booleanPatterns: [
        /^is[A-Z]/,
        /^has[A-Z]/,
        /^can[A-Z]/,
        /^should[A-Z]/,
        /^enabled$/i,
        /^disabled$/i,
        /^active$/i,
        /^verified$/i,
    ],
};

/**
 * Merge custom conventions with defaults
 *
 * @param custom - Partial conventions to merge
 * @returns Complete conventions object
 */
export function mergeConventions(custom?: Partial<FieldConventions>): FieldConventions {
    if (!custom) {
        return DEFAULT_CONVENTIONS;
    }

    return {
        datePatterns: [...DEFAULT_CONVENTIONS.datePatterns, ...(custom.datePatterns || [])],
        codePatterns: [...DEFAULT_CONVENTIONS.codePatterns, ...(custom.codePatterns || [])],
        badgePatterns: [...DEFAULT_CONVENTIONS.badgePatterns, ...(custom.badgePatterns || [])],
        urlPatterns: [...DEFAULT_CONVENTIONS.urlPatterns, ...(custom.urlPatterns || [])],
        emailPatterns: [...DEFAULT_CONVENTIONS.emailPatterns, ...(custom.emailPatterns || [])],
        hiddenPatterns: [...DEFAULT_CONVENTIONS.hiddenPatterns, ...(custom.hiddenPatterns || [])],
        booleanPatterns: [...DEFAULT_CONVENTIONS.booleanPatterns, ...(custom.booleanPatterns || [])],
    };
}
