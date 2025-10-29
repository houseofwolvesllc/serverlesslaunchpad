/**
 * Route Generator Tests
 *
 * Tests for the route generation utility that creates React Router routes
 * from the sitemap API navigation structure.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    extractNavigableItems,
    normalizePathForRouter,
    generateRoutesFromSitemap,
} from '../../src/routing/route_generator';
import { NavigationItem } from '../../src/features/sitemap/utils/transform_navigation';
import * as componentRegistry from '../../src/routing/component_registry';

// Mock component registry
vi.mock('../../src/routing/component_registry');

describe('extractNavigableItems', () => {
    it('should extract items with href and no POST method', () => {
        const items: NavigationItem[] = [
            {
                id: 'sessions',
                title: 'Sessions',
                href: '/users/123/sessions/list',
            },
        ];

        const navigable = extractNavigableItems(items);

        expect(navigable).toHaveLength(1);
        expect(navigable[0].id).toBe('sessions');
    });

    it('should exclude POST actions but include POST list endpoints', () => {
        const items: NavigationItem[] = [
            {
                id: 'sessions',
                title: 'Sessions',
                href: '/users/123/sessions/list',
                method: 'POST', // POST but ends with /list
            },
            {
                id: 'logout',
                title: 'Logout',
                href: '/authentication/revoke',
                method: 'POST', // POST action - excluded
            },
        ];

        const navigable = extractNavigableItems(items);

        expect(navigable).toHaveLength(1);
        expect(navigable[0].id).toBe('sessions');
    });

    it('should exclude items without href', () => {
        const items: NavigationItem[] = [
            {
                id: 'account',
                title: 'Account',
                items: [
                    {
                        id: 'sessions',
                        title: 'Sessions',
                        href: '/users/123/sessions/list',
                    },
                ],
            },
        ];

        const navigable = extractNavigableItems(items);

        expect(navigable).toHaveLength(1);
        expect(navigable[0].id).toBe('sessions');
    });

    it('should recursively extract from nested items', () => {
        const items: NavigationItem[] = [
            {
                id: 'account',
                title: 'Account',
                items: [
                    {
                        id: 'sessions',
                        title: 'Sessions',
                        href: '/users/123/sessions/list',
                    },
                    {
                        id: 'api-keys',
                        title: 'API Keys',
                        href: '/users/123/api-keys/list',
                    },
                ],
            },
        ];

        const navigable = extractNavigableItems(items);

        expect(navigable).toHaveLength(2);
        expect(navigable[0].id).toBe('sessions');
        expect(navigable[1].id).toBe('api-keys');
    });

    it('should handle deeply nested structures', () => {
        const items: NavigationItem[] = [
            {
                id: 'root',
                title: 'Root',
                items: [
                    {
                        id: 'level1',
                        title: 'Level 1',
                        items: [
                            {
                                id: 'level2',
                                title: 'Level 2',
                                href: '/deep/nested/route',
                            },
                        ],
                    },
                ],
            },
        ];

        const navigable = extractNavigableItems(items);

        expect(navigable).toHaveLength(1);
        expect(navigable[0].id).toBe('level2');
        expect(navigable[0].href).toBe('/deep/nested/route');
    });

    it('should handle empty array', () => {
        const navigable = extractNavigableItems([]);
        expect(navigable).toHaveLength(0);
    });

    it('should handle mixed POST and GET items', () => {
        const items: NavigationItem[] = [
            {
                id: 'account',
                title: 'Account',
                items: [
                    {
                        id: 'sessions',
                        title: 'Sessions',
                        href: '/users/123/sessions/list',
                        method: 'POST', // Included (ends with /list)
                    },
                    {
                        id: 'profile',
                        title: 'Profile',
                        href: '/users/123/profile', // Included (no POST)
                    },
                    {
                        id: 'logout',
                        title: 'Logout',
                        href: '/authentication/revoke',
                        method: 'POST', // Excluded (POST action)
                    },
                ],
            },
        ];

        const navigable = extractNavigableItems(items);

        expect(navigable).toHaveLength(2);
        expect(navigable[0].id).toBe('sessions');
        expect(navigable[1].id).toBe('profile');
    });
});

describe('normalizePathForRouter', () => {
    it('should remove leading slash from absolute paths', () => {
        const normalized = normalizePathForRouter('/users/123/sessions/list');
        expect(normalized).toBe('users/123/sessions/list');
    });

    it('should leave relative paths unchanged', () => {
        const normalized = normalizePathForRouter('users/123/sessions/list');
        expect(normalized).toBe('users/123/sessions/list');
    });

    it('should handle root path', () => {
        const normalized = normalizePathForRouter('/');
        expect(normalized).toBe('');
    });

    it('should handle empty string', () => {
        const normalized = normalizePathForRouter('');
        expect(normalized).toBe('');
    });

    it('should handle paths with query parameters', () => {
        const normalized = normalizePathForRouter('/users/123/sessions?active=true');
        expect(normalized).toBe('users/123/sessions?active=true');
    });

    it('should handle paths with hashes', () => {
        const normalized = normalizePathForRouter('/users/123/sessions#active');
        expect(normalized).toBe('users/123/sessions#active');
    });
});

describe('generateRoutesFromSitemap', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should generate routes for items with registered components', () => {
        const items: NavigationItem[] = [
            {
                id: 'sessions',
                title: 'Sessions',
                href: '/users/123/sessions/list',
            },
        ];

        const mockComponent = () => null;
        vi.mocked(componentRegistry.getComponentForId).mockReturnValue(mockComponent);

        const routes = generateRoutesFromSitemap(items);

        expect(routes).toHaveLength(1);
        expect(routes[0].path).toBe('users/123/sessions/list');
        expect(routes[0].element).toBeDefined();
    });

    it('should skip items without registered components', () => {
        const items: NavigationItem[] = [
            {
                id: 'unknown',
                title: 'Unknown',
                href: '/unknown',
            },
        ];

        vi.mocked(componentRegistry.getComponentForId).mockReturnValue(null);

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const routes = generateRoutesFromSitemap(items);

        expect(routes).toHaveLength(0);
        // Logger now outputs structured JSON, so verify it was called at least once
        expect(consoleWarnSpy).toHaveBeenCalled();

        // Verify the warning contains relevant info
        const warnCall = consoleWarnSpy.mock.calls[0][0];
        expect(warnCall).toContain('No component registered for navigation id');
        expect(warnCall).toContain('unknown');
        expect(warnCall).toContain('/unknown');

        consoleWarnSpy.mockRestore();
    });

    it('should generate multiple routes from nested structure', () => {
        const items: NavigationItem[] = [
            {
                id: 'account',
                title: 'Account',
                items: [
                    {
                        id: 'sessions',
                        title: 'Sessions',
                        href: '/users/123/sessions/list',
                    },
                    {
                        id: 'api-keys',
                        title: 'API Keys',
                        href: '/users/123/api-keys/list',
                    },
                ],
            },
        ];

        const mockComponent = () => null;
        vi.mocked(componentRegistry.getComponentForId).mockReturnValue(mockComponent);

        const routes = generateRoutesFromSitemap(items);

        expect(routes).toHaveLength(2);
        expect(routes[0].path).toBe('users/123/sessions/list');
        expect(routes[1].path).toBe('users/123/api-keys/list');
    });

    it('should include POST list endpoints but exclude POST actions', () => {
        const items: NavigationItem[] = [
            {
                id: 'sessions',
                title: 'Sessions',
                href: '/users/123/sessions/list',
                method: 'POST', // Included (ends with /list)
            },
            {
                id: 'logout',
                title: 'Logout',
                href: '/authentication/revoke',
                method: 'POST', // Excluded (action)
            },
        ];

        const mockComponent = () => null;
        vi.mocked(componentRegistry.getComponentForId).mockReturnValue(mockComponent);

        const routes = generateRoutesFromSitemap(items);

        expect(routes).toHaveLength(1);
        expect(routes[0].path).toBe('users/123/sessions/list');
    });

    it('should handle empty sitemap', () => {
        const routes = generateRoutesFromSitemap([]);
        expect(routes).toHaveLength(0);
    });

    it('should normalize paths (remove leading slashes)', () => {
        const items: NavigationItem[] = [
            {
                id: 'sessions',
                title: 'Sessions',
                href: '/users/123/sessions/list',
            },
        ];

        const mockComponent = () => null;
        vi.mocked(componentRegistry.getComponentForId).mockReturnValue(mockComponent);

        const routes = generateRoutesFromSitemap(items);

        expect(routes[0].path).toBe('users/123/sessions/list');
        expect(routes[0].path).not.toMatch(/^\//);
    });

    it('should handle mixed registered and unregistered components', () => {
        const items: NavigationItem[] = [
            {
                id: 'sessions',
                title: 'Sessions',
                href: '/users/123/sessions/list',
            },
            {
                id: 'unknown',
                title: 'Unknown',
                href: '/unknown',
            },
            {
                id: 'api-keys',
                title: 'API Keys',
                href: '/users/123/api-keys/list',
            },
        ];

        const mockComponent = () => null;
        vi.mocked(componentRegistry.getComponentForId).mockImplementation((id: string) => {
            if (id === 'sessions' || id === 'api-keys') {
                return mockComponent;
            }
            return null;
        });

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const routes = generateRoutesFromSitemap(items);

        expect(routes).toHaveLength(2);
        expect(routes[0].path).toBe('users/123/sessions/list');
        expect(routes[1].path).toBe('users/123/api-keys/list');
        expect(consoleWarnSpy).toHaveBeenCalledTimes(1);

        consoleWarnSpy.mockRestore();
    });
});
