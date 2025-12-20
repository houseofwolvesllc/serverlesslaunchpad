import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EntryPoint, createEntryPoint } from '../../src/services/entry_point';
import type { HalObject } from '../../src/types/hal';

describe('EntryPoint', () => {
    let entryPoint: EntryPoint;
    const mockBaseUrl = 'https://api.example.com';

    const mockRootResponse: HalObject = {
        _links: {
            self: { href: '/' },
            user: { href: '/user' },
            sessions: { href: '/users/{userId}/sessions', templated: true },
            'api-keys': { href: '/users/{userId}/api-keys', templated: true },
            sitemap: { href: '/sitemap' },
        },
        version: '1.0.0',
        environment: 'production',
    };

    beforeEach(() => {
        // Reset fetch mock before each test
        global.fetch = vi.fn();

        entryPoint = new EntryPoint({
            baseUrl: mockBaseUrl,
            cacheTtl: 1000, // 1 second for testing
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('fetch', () => {
        it('should fetch the API entry point', async () => {
            // Arrange
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => mockRootResponse,
            });

            // Act
            const result = await entryPoint.fetch();

            // Assert
            expect(global.fetch).toHaveBeenCalledWith(mockBaseUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/hal+json, application/json',
                },
            });
            expect(result).toEqual(mockRootResponse);
        });

        it('should include default headers in request', async () => {
            // Arrange
            entryPoint = new EntryPoint({
                baseUrl: mockBaseUrl,
                defaultHeaders: {
                    'Authorization': 'Bearer token123',
                    'X-Custom': 'value',
                },
            });

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => mockRootResponse,
            });

            // Act
            await entryPoint.fetch();

            // Assert
            expect(global.fetch).toHaveBeenCalledWith(mockBaseUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/hal+json, application/json',
                    'Authorization': 'Bearer token123',
                    'X-Custom': 'value',
                },
            });
        });

        it('should cache the response', async () => {
            // Arrange
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => mockRootResponse,
            });

            // Act - First call
            const result1 = await entryPoint.fetch();
            // Second call
            const result2 = await entryPoint.fetch();

            // Assert - fetch should only be called once
            expect(global.fetch).toHaveBeenCalledTimes(1);
            expect(result1).toEqual(result2);
        });

        it('should bypass cache when forceRefresh is true', async () => {
            // Arrange
            (global.fetch as any).mockResolvedValue({
                ok: true,
                json: async () => mockRootResponse,
            });

            // Act
            await entryPoint.fetch(); // First call
            await entryPoint.fetch(true); // Force refresh

            // Assert - fetch should be called twice
            expect(global.fetch).toHaveBeenCalledTimes(2);
        });

        it('should refresh cache after TTL expires', async () => {
            // Arrange
            (global.fetch as any).mockResolvedValue({
                ok: true,
                json: async () => mockRootResponse,
            });

            // Act
            await entryPoint.fetch(); // First call

            // Wait for cache to expire (1 second TTL + buffer)
            await new Promise(resolve => setTimeout(resolve, 1100));

            await entryPoint.fetch(); // Should fetch again

            // Assert
            expect(global.fetch).toHaveBeenCalledTimes(2);
        });

        it('should throw error on failed request', async () => {
            // Arrange
            (global.fetch as any).mockResolvedValueOnce({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
            });

            // Act & Assert
            await expect(entryPoint.fetch()).rejects.toThrow(
                'Failed to fetch API entry point: 500 Internal Server Error'
            );
        });

        it('should throw error on network failure', async () => {
            // Arrange
            (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

            // Act & Assert
            await expect(entryPoint.fetch()).rejects.toThrow('Network error');
        });
    });

    describe('getLinkHref', () => {
        beforeEach(() => {
            (global.fetch as any).mockResolvedValue({
                ok: true,
                json: async () => mockRootResponse,
            });
        });

        it('should get link href from entry point', async () => {
            // Act
            const href = await entryPoint.getLinkHref('user');

            // Assert
            expect(href).toBe('/user');
        });

        it('should return undefined for non-existent link', async () => {
            // Act
            const href = await entryPoint.getLinkHref('nonexistent');

            // Assert
            expect(href).toBeUndefined();
        });

        it('should expand templated links with params', async () => {
            // Act
            const href = await entryPoint.getLinkHref('sessions', { userId: '123' });

            // Assert
            expect(href).toBe('/users/123/sessions');
        });

        it('should handle multiple relation fallbacks', async () => {
            // Act
            const href = await entryPoint.getLinkHref(['nonexistent', 'user']);

            // Assert
            expect(href).toBe('/user');
        });
    });

    describe('hasCapability', () => {
        beforeEach(() => {
            (global.fetch as any).mockResolvedValue({
                ok: true,
                json: async () => mockRootResponse,
            });
        });

        it('should return true for existing capability', async () => {
            // Act
            const hasCapability = await entryPoint.hasCapability('user');

            // Assert
            expect(hasCapability).toBe(true);
        });

        it('should return false for non-existent capability', async () => {
            // Act
            const hasCapability = await entryPoint.hasCapability('admin');

            // Assert
            expect(hasCapability).toBe(false);
        });

        it('should check multiple relations', async () => {
            // Act
            const hasCapability = await entryPoint.hasCapability(['admin', 'sitemap']);

            // Assert
            expect(hasCapability).toBe(true); // sitemap exists
        });
    });

    describe('getCapabilities', () => {
        beforeEach(() => {
            (global.fetch as any).mockResolvedValue({
                ok: true,
                json: async () => mockRootResponse,
            });
        });

        it('should return all available capabilities', async () => {
            // Act
            const capabilities = await entryPoint.getCapabilities();

            // Assert
            expect(capabilities).toHaveLength(5);
            expect(capabilities).toContain('self');
            expect(capabilities).toContain('user');
            expect(capabilities).toContain('sessions');
            expect(capabilities).toContain('api-keys');
            expect(capabilities).toContain('sitemap');
        });

        it('should return empty array for entry point with no links', async () => {
            // Arrange
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({}),
            });

            // Act
            const capabilities = await entryPoint.getCapabilities();

            // Assert
            expect(capabilities).toEqual([]);
        });
    });

    describe('clearCache', () => {
        it('should clear the cache', async () => {
            // Arrange
            (global.fetch as any).mockResolvedValue({
                ok: true,
                json: async () => mockRootResponse,
            });

            await entryPoint.fetch(); // Populate cache
            expect(global.fetch).toHaveBeenCalledTimes(1);

            // Act
            entryPoint.clearCache();
            await entryPoint.fetch(); // Should fetch again

            // Assert
            expect(global.fetch).toHaveBeenCalledTimes(2);
        });
    });

    describe('setAuthToken', () => {
        it('should update auth token and clear cache', async () => {
            // Arrange
            (global.fetch as any).mockResolvedValue({
                ok: true,
                json: async () => mockRootResponse,
            });

            await entryPoint.fetch(); // Populate cache

            // Act
            entryPoint.setAuthToken('Bearer newtoken123');
            await entryPoint.fetch();

            // Assert
            expect(global.fetch).toHaveBeenCalledTimes(2);
            expect(global.fetch).toHaveBeenLastCalledWith(mockBaseUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/hal+json, application/json',
                    'Authorization': 'Bearer newtoken123',
                },
            });
        });
    });

    describe('clearAuthToken', () => {
        it('should remove auth token and clear cache', async () => {
            // Arrange
            entryPoint.setAuthToken('Bearer token123');
            (global.fetch as any).mockResolvedValue({
                ok: true,
                json: async () => mockRootResponse,
            });

            await entryPoint.fetch(); // Populate cache

            // Act
            entryPoint.clearAuthToken();
            await entryPoint.fetch();

            // Assert
            expect(global.fetch).toHaveBeenCalledTimes(2);
            expect(global.fetch).toHaveBeenLastCalledWith(mockBaseUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/hal+json, application/json',
                },
            });
        });
    });

    describe('getBaseUrl', () => {
        it('should return the current base URL', () => {
            // Act
            const baseUrl = entryPoint.getBaseUrl();

            // Assert
            expect(baseUrl).toBe(mockBaseUrl);
        });
    });

    describe('setBaseUrl', () => {
        it('should update base URL and clear cache', async () => {
            // Arrange
            (global.fetch as any).mockResolvedValue({
                ok: true,
                json: async () => mockRootResponse,
            });

            await entryPoint.fetch(); // Populate cache
            const newUrl = 'https://api.newdomain.com';

            // Act
            entryPoint.setBaseUrl(newUrl);
            await entryPoint.fetch();

            // Assert
            expect(global.fetch).toHaveBeenCalledTimes(2);
            expect(global.fetch).toHaveBeenLastCalledWith(newUrl, expect.any(Object));
            expect(entryPoint.getBaseUrl()).toBe(newUrl);
        });
    });

    describe('getCachedData', () => {
        it('should return cached data if valid', async () => {
            // Arrange
            (global.fetch as any).mockResolvedValue({
                ok: true,
                json: async () => mockRootResponse,
            });

            await entryPoint.fetch();

            // Act
            const cached = entryPoint.getCachedData();

            // Assert
            expect(cached).toEqual(mockRootResponse);
        });

        it('should return undefined if cache is empty', () => {
            // Act
            const cached = entryPoint.getCachedData();

            // Assert
            expect(cached).toBeUndefined();
        });

        it('should return undefined if cache is expired', async () => {
            // Arrange
            (global.fetch as any).mockResolvedValue({
                ok: true,
                json: async () => mockRootResponse,
            });

            await entryPoint.fetch();

            // Wait for cache to expire
            await new Promise(resolve => setTimeout(resolve, 1100));

            // Act
            const cached = entryPoint.getCachedData();

            // Assert
            expect(cached).toBeUndefined();
        });

        it('should return undefined after clearCache', async () => {
            // Arrange
            (global.fetch as any).mockResolvedValue({
                ok: true,
                json: async () => mockRootResponse,
            });

            await entryPoint.fetch();
            entryPoint.clearCache();

            // Act
            const cached = entryPoint.getCachedData();

            // Assert
            expect(cached).toBeUndefined();
        });
    });

    describe('createEntryPoint factory', () => {
        it('should create a new EntryPoint instance', () => {
            // Act
            const instance = createEntryPoint({
                baseUrl: 'https://api.test.com',
            });

            // Assert
            expect(instance).toBeInstanceOf(EntryPoint);
            expect(instance.getBaseUrl()).toBe('https://api.test.com');
        });

        it('should accept all configuration options', () => {
            // Act
            const instance = createEntryPoint({
                baseUrl: 'https://api.test.com',
                defaultHeaders: { 'X-Custom': 'value' },
                cacheTtl: 10000,
            });

            // Assert
            expect(instance).toBeInstanceOf(EntryPoint);
        });
    });

    describe('real-world scenarios', () => {
        it('should handle authenticated API discovery', async () => {
            // Arrange
            const authenticatedRoot: HalObject = {
                _links: {
                    self: { href: '/' },
                    user: { href: '/user' },
                    sessions: { href: '/users/{userId}/sessions', templated: true },
                    'api-keys': { href: '/users/{userId}/api-keys', templated: true },
                    admin: { href: '/admin' },
                    sitemap: { href: '/sitemap' },
                },
            };

            (global.fetch as any).mockResolvedValue({
                ok: true,
                json: async () => authenticatedRoot,
            });

            // Act
            entryPoint.setAuthToken('Bearer abc123');
            const hasAdmin = await entryPoint.hasCapability('admin');
            const adminHref = await entryPoint.getLinkHref('admin');

            // Assert
            expect(hasAdmin).toBe(true);
            expect(adminHref).toBe('/admin');
        });

        it('should handle unauthenticated API with limited capabilities', async () => {
            // Arrange
            const unauthenticatedRoot: HalObject = {
                _links: {
                    self: { href: '/' },
                    login: { href: '/auth/login' },
                    signup: { href: '/auth/signup' },
                    sitemap: { href: '/sitemap' },
                },
            };

            (global.fetch as any).mockResolvedValue({
                ok: true,
                json: async () => unauthenticatedRoot,
            });

            // Act
            const hasUser = await entryPoint.hasCapability('user');
            const hasLogin = await entryPoint.hasCapability('login');

            // Assert
            expect(hasUser).toBe(false);
            expect(hasLogin).toBe(true);
        });

        it('should efficiently use cache for multiple capability checks', async () => {
            // Arrange
            (global.fetch as any).mockResolvedValue({
                ok: true,
                json: async () => mockRootResponse,
            });

            // Act - Multiple operations
            await entryPoint.hasCapability('user');
            await entryPoint.hasCapability('sessions');
            await entryPoint.getLinkHref('api-keys');
            const capabilities = await entryPoint.getCapabilities();

            // Assert - Should only fetch once due to caching
            expect(global.fetch).toHaveBeenCalledTimes(1);
            expect(capabilities.length).toBeGreaterThan(0);
        });
    });
});
