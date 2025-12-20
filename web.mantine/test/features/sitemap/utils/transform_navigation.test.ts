/**
 * Tests for Navigation Transformation Utility
 */

import { describe, it, expect } from 'vitest';
import {
    expandTemplatedUri,
    shouldIncludeItem,
    transformNavigationItem,
    transformNavigationItems,
    createFallbackNavigation,
    type NavigationItem,
    type UserContext,
} from '../../../../src/features/sitemap/utils/transform_navigation';
import { IconCircle } from '@tabler/icons-react';

describe('Navigation Transformation', () => {
    describe('expandTemplatedUri', () => {
        it('should expand simple template variables', () => {
            const result = expandTemplatedUri('/users/{userId}/sessions', { userId: '123' });
            expect(result).toBe('/users/123/sessions');
        });

        it('should expand multiple template variables', () => {
            const result = expandTemplatedUri('/users/{userId}/items/{itemId}', {
                userId: '123',
                itemId: '456',
            });
            expect(result).toBe('/users/123/items/456');
        });

        it('should leave unexpanded variables unchanged', () => {
            const result = expandTemplatedUri('/users/{userId}/items/{itemId}', { userId: '123' });
            expect(result).toBe('/users/123/items/{itemId}');
        });

        it('should handle URIs without templates', () => {
            const result = expandTemplatedUri('/users/sessions', {});
            expect(result).toBe('/users/sessions');
        });
    });

    describe('shouldIncludeItem', () => {
        const adminItem: NavigationItem = {
            id: 'admin',
            title: 'Admin',
            requiresRole: 'Admin',
        };

        const publicItem: NavigationItem = {
            id: 'public',
            title: 'Public',
        };

        it('should include items without role requirements', () => {
            expect(shouldIncludeItem(publicItem, undefined)).toBe(true);
            expect(shouldIncludeItem(publicItem, 'User')).toBe(true);
        });

        it('should exclude items with role requirements when no user role', () => {
            expect(shouldIncludeItem(adminItem, undefined)).toBe(false);
        });

        it('should include items when user has exact role', () => {
            expect(shouldIncludeItem(adminItem, 'Admin')).toBe(true);
        });

        it('should include all items for Admin role', () => {
            const userItem: NavigationItem = {
                id: 'user',
                title: 'User',
                requiresRole: 'User',
            };
            expect(shouldIncludeItem(userItem, 'Admin')).toBe(true);
        });
    });

    describe('transformNavigationItem', () => {
        it('should transform simple navigation item', () => {
            const item: NavigationItem = {
                id: 'home',
                title: 'Home',
                icon: 'home',
                href: '/',
            };

            const result = transformNavigationItem(item);
            expect(result).toBeDefined();
            expect(result?.label).toBe('Home');
            expect(result?.icon).toBeDefined();
            expect(result?.links).toBeUndefined();
        });

        it('should transform nested navigation item', () => {
            const item: NavigationItem = {
                id: 'users',
                title: 'User Management',
                icon: 'users',
                items: [
                    {
                        id: 'sessions',
                        title: 'Sessions',
                        href: '/sessions',
                    },
                    {
                        id: 'api-keys',
                        title: 'API Keys',
                        href: '/api_keys',
                    },
                ],
            };

            const result = transformNavigationItem(item);
            expect(result).toBeDefined();
            expect(result?.label).toBe('User Management');
            expect(result?.links).toBeDefined();
            expect(result?.links).toHaveLength(2);
            expect(result?.links?.[0].label).toBe('Sessions');
            expect(result?.links?.[1].label).toBe('API Keys');
        });

        it('should expand templated URIs in child items', () => {
            const item: NavigationItem = {
                id: 'users',
                title: 'User Management',
                icon: 'users',
                items: [
                    {
                        id: 'sessions',
                        title: 'Sessions',
                        href: '/users/{userId}/sessions',
                        templated: true,
                    },
                ],
            };

            const userContext: UserContext = {
                userId: '123',
            };

            const result = transformNavigationItem(item, userContext);
            expect(result?.links?.[0].link).toBe('/users/123/sessions');
        });

        it('should filter out items based on role', () => {
            const item: NavigationItem = {
                id: 'admin',
                title: 'Admin',
                icon: 'shield',
                requiresRole: 'Admin',
            };

            const result = transformNavigationItem(item, { userId: '123', role: 'User' });
            expect(result).toBeNull();
        });

        it('should filter out child items based on role', () => {
            const item: NavigationItem = {
                id: 'users',
                title: 'User Management',
                icon: 'users',
                items: [
                    {
                        id: 'public',
                        title: 'Public Item',
                        href: '/public',
                    },
                    {
                        id: 'admin',
                        title: 'Admin Item',
                        href: '/admin',
                        requiresRole: 'Admin',
                    },
                ],
            };

            const result = transformNavigationItem(item, { userId: '123', role: 'User' });
            expect(result?.links).toHaveLength(1);
            expect(result?.links?.[0].label).toBe('Public Item');
        });

        it('should use default icon for unknown icon names', () => {
            const item: NavigationItem = {
                id: 'test',
                title: 'Test',
                icon: 'unknown-icon',
            };

            const result = transformNavigationItem(item);
            expect(result?.icon).toBe(IconCircle);
        });
    });

    describe('transformNavigationItems', () => {
        it('should transform array of navigation items', () => {
            const items: NavigationItem[] = [
                { id: 'home', title: 'Home', icon: 'home' },
                { id: 'users', title: 'Users', icon: 'users' },
            ];

            const result = transformNavigationItems(items);
            expect(result).toHaveLength(2);
            expect(result[0].label).toBe('Home');
            expect(result[1].label).toBe('Users');
        });

        it('should filter out items based on role', () => {
            const items: NavigationItem[] = [
                { id: 'public', title: 'Public', icon: 'home' },
                { id: 'admin', title: 'Admin', icon: 'shield', requiresRole: 'Admin' },
            ];

            const result = transformNavigationItems(items, { userId: '123', role: 'User' });
            expect(result).toHaveLength(1);
            expect(result[0].label).toBe('Public');
        });

        it('should handle empty array', () => {
            const result = transformNavigationItems([]);
            expect(result).toHaveLength(0);
        });
    });

    describe('createFallbackNavigation', () => {
        it('should create minimal navigation for unauthenticated users', () => {
            const result = createFallbackNavigation();
            expect(result).toBeDefined();
            expect(result.length).toBeGreaterThan(0);
            expect(result[0].label).toBe('Home');
        });

        it('should create minimal navigation (Home only) for all users', () => {
            const result = createFallbackNavigation({ userId: '123' });
            // Current implementation returns only Home link regardless of authentication
            expect(result.length).toBe(1);
            expect(result[0].label).toBe('Home');
            expect(result[0].link).toBe('/');
        });

        it('should return consistent navigation regardless of user context', () => {
            const unauthResult = createFallbackNavigation();
            const authResult = createFallbackNavigation({ userId: '123' });

            // Fallback navigation is intentionally minimal and identical for all users
            expect(unauthResult).toEqual(authResult);
            expect(authResult.length).toBe(1);
            expect(authResult[0].label).toBe('Home');
        });
    });
});
