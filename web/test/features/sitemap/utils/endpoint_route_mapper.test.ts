/**
 * Unit tests for endpoint_route_mapper
 */

import { describe, it, expect } from 'vitest';
import { mapEndpointToRoute, extractResourceName, ENDPOINT_ROUTE_MAP } from '../../../../src/features/sitemap/utils/endpoint_route_mapper';

describe('mapEndpointToRoute', () => {
    it('should map API Keys list endpoint to /account/api-keys', () => {
        const result = mapEndpointToRoute('/users/abc123def/api_keys/list', 'POST');
        expect(result).toBe('/account/api-keys');
    });

    it('should map Sessions list endpoint to /account/sessions', () => {
        const result = mapEndpointToRoute('/users/abc123def/sessions/list', 'POST');
        expect(result).toBe('/account/sessions');
    });

    it('should handle dynamic userId segments', () => {
        const result = mapEndpointToRoute('/users/765a750720dd481081b28a802bfe7cf0/api_keys/list', 'POST');
        expect(result).toBe('/account/api-keys');
    });

    it('should return href directly for GET requests', () => {
        const result = mapEndpointToRoute('/sitemap', 'GET');
        expect(result).toBe('/sitemap');
    });

    it('should use href as fallback for unmapped POST endpoints', () => {
        const result = mapEndpointToRoute('/some/unknown/endpoint', 'POST');
        expect(result).toBe('/some/unknown/endpoint');
    });

    it('should handle exact matches', () => {
        // Temporarily add an exact match to the map
        const testHref = '/exact/match/test';
        const originalMap = { ...ENDPOINT_ROUTE_MAP };
        ENDPOINT_ROUTE_MAP[testHref] = '/test/route';

        const result = mapEndpointToRoute(testHref, 'POST');
        expect(result).toBe('/test/route');

        // Restore original map
        Object.assign(ENDPOINT_ROUTE_MAP, originalMap);
    });
});

describe('extractResourceName', () => {
    it('should extract "API Keys" from api_keys list endpoint', () => {
        const result = extractResourceName('/users/abc123/api_keys/list');
        expect(result).toBe('Api Keys');
    });

    it('should extract "Sessions" from sessions list endpoint', () => {
        const result = extractResourceName('/users/abc123/sessions/list');
        expect(result).toBe('Sessions');
    });

    it('should handle snake_case to Title Case conversion', () => {
        const result = extractResourceName('/users/abc123/user_preferences/list');
        expect(result).toBe('User Preferences');
    });

    it('should return href as fallback for non-list endpoints', () => {
        const result = extractResourceName('/some/random/path');
        expect(result).toBe('/some/random/path');
    });
});

describe('ENDPOINT_ROUTE_MAP', () => {
    it('should contain mapping for API keys', () => {
        expect(ENDPOINT_ROUTE_MAP['/users/{userId}/api_keys/list']).toBe('/account/api-keys');
    });

    it('should contain mapping for sessions', () => {
        expect(ENDPOINT_ROUTE_MAP['/users/{userId}/sessions/list']).toBe('/account/sessions');
    });

    it('should have a default fallback', () => {
        expect(ENDPOINT_ROUTE_MAP.default).toBe('{href}');
    });
});
