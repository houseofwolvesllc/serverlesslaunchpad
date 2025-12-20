import { describe, it, expect, beforeEach } from 'vitest';
import { LinkNavigator } from './link_navigator';
import type { HalObject, HalLink } from '../types/hal';

describe('LinkNavigator', () => {
    let navigator: LinkNavigator;

    beforeEach(() => {
        navigator = new LinkNavigator();
    });

    describe('findLink', () => {
        it('should find a link by relation', () => {
            // Arrange
            const resource: HalObject = {
                _links: {
                    self: { href: '/users/123' },
                    sessions: { href: '/users/123/sessions' },
                },
            };

            // Act
            const link = navigator.findLink(resource, 'sessions');

            // Assert
            expect(link).toBeDefined();
            expect(link?.href).toBe('/users/123/sessions');
        });

        it('should return undefined if link not found', () => {
            // Arrange
            const resource: HalObject = {
                _links: {
                    self: { href: '/users/123' },
                },
            };

            // Act
            const link = navigator.findLink(resource, 'nonexistent');

            // Assert
            expect(link).toBeUndefined();
        });

        it('should return undefined if resource has no links', () => {
            // Arrange
            const resource: HalObject = {};

            // Act
            const link = navigator.findLink(resource, 'self');

            // Assert
            expect(link).toBeUndefined();
        });

        it('should handle array of links and return first', () => {
            // Arrange
            const resource: HalObject = {
                _links: {
                    alternate: [
                        { href: '/api/v1/users/123', type: 'application/json' },
                        { href: '/api/v2/users/123', type: 'application/json' },
                    ],
                },
            };

            // Act
            const link = navigator.findLink(resource, 'alternate');

            // Assert
            expect(link).toBeDefined();
            expect(link?.href).toBe('/api/v1/users/123');
        });

        it('should try multiple relations in order', () => {
            // Arrange
            const resource: HalObject = {
                _links: {
                    primary: { href: '/primary' },
                    fallback: { href: '/fallback' },
                },
            };

            // Act - First relation doesn't exist, should find second
            const link = navigator.findLink(resource, ['nonexistent', 'fallback']);

            // Assert
            expect(link).toBeDefined();
            expect(link?.href).toBe('/fallback');
        });

        it('should return first matching relation from array', () => {
            // Arrange
            const resource: HalObject = {
                _links: {
                    primary: { href: '/primary' },
                    secondary: { href: '/secondary' },
                },
            };

            // Act
            const link = navigator.findLink(resource, ['primary', 'secondary']);

            // Assert
            expect(link).toBeDefined();
            expect(link?.href).toBe('/primary');
        });
    });

    describe('getHref', () => {
        it('should extract href from a link', () => {
            // Arrange
            const resource: HalObject = {
                _links: {
                    sessions: { href: '/users/123/sessions' },
                },
            };

            // Act
            const href = navigator.getHref(resource, 'sessions');

            // Assert
            expect(href).toBe('/users/123/sessions');
        });

        it('should return undefined if link not found', () => {
            // Arrange
            const resource: HalObject = {
                _links: {
                    self: { href: '/users/123' },
                },
            };

            // Act
            const href = navigator.getHref(resource, 'nonexistent');

            // Assert
            expect(href).toBeUndefined();
        });

        it('should expand templated links with params', () => {
            // Arrange
            const resource: HalObject = {
                _links: {
                    search: {
                        href: '/users/{userId}/sessions{?limit,offset}',
                        templated: true,
                    },
                },
            };

            // Act
            const href = navigator.getHref(resource, 'search', {
                userId: '123',
                limit: 10,
                offset: 20,
            });

            // Assert
            expect(href).toBe('/users/123/sessions?limit=10&offset=20');
        });

        it('should not expand non-templated links even with params', () => {
            // Arrange
            const resource: HalObject = {
                _links: {
                    sessions: { href: '/users/123/sessions' },
                },
            };

            // Act
            const href = navigator.getHref(resource, 'sessions', { limit: 10 });

            // Assert
            expect(href).toBe('/users/123/sessions');
        });
    });

    describe('hasCapability', () => {
        it('should return true if link exists', () => {
            // Arrange
            const resource: HalObject = {
                _links: {
                    delete: { href: '/users/123', title: 'Delete User' },
                },
            };

            // Act
            const hasCapability = navigator.hasCapability(resource, 'delete');

            // Assert
            expect(hasCapability).toBe(true);
        });

        it('should return false if link does not exist', () => {
            // Arrange
            const resource: HalObject = {
                _links: {
                    self: { href: '/users/123' },
                },
            };

            // Act
            const hasCapability = navigator.hasCapability(resource, 'delete');

            // Assert
            expect(hasCapability).toBe(false);
        });

        it('should return false if resource has no links', () => {
            // Arrange
            const resource: HalObject = {};

            // Act
            const hasCapability = navigator.hasCapability(resource, 'delete');

            // Assert
            expect(hasCapability).toBe(false);
        });

        it('should check multiple relations', () => {
            // Arrange
            const resource: HalObject = {
                _links: {
                    update: { href: '/users/123' },
                },
            };

            // Act
            const hasCapability = navigator.hasCapability(resource, ['delete', 'update']);

            // Assert
            expect(hasCapability).toBe(true);
        });
    });

    describe('expandTemplate', () => {
        it('should expand simple path parameters', () => {
            // Arrange
            const template = '/users/{userId}/sessions/{sessionId}';
            const params = { userId: '123', sessionId: 'abc' };

            // Act
            const result = navigator.expandTemplate(template, params);

            // Assert
            expect(result).toBe('/users/123/sessions/abc');
        });

        it('should expand query parameters', () => {
            // Arrange
            const template = '/users{?limit,offset,sort}';
            const params = { limit: 10, offset: 20, sort: 'name' };

            // Act
            const result = navigator.expandTemplate(template, params);

            // Assert
            expect(result).toBe('/users?limit=10&offset=20&sort=name');
        });

        it('should handle mixed path and query parameters', () => {
            // Arrange
            const template = '/users/{userId}/sessions{?limit,offset}';
            const params = { userId: '123', limit: 10, offset: 0 };

            // Act
            const result = navigator.expandTemplate(template, params);

            // Assert
            expect(result).toBe('/users/123/sessions?limit=10&offset=0');
        });

        it('should skip undefined parameters', () => {
            // Arrange
            const template = '/users/{userId}/sessions{?limit,offset}';
            const params = { userId: '123', limit: 10 }; // offset is undefined

            // Act
            const result = navigator.expandTemplate(template, params);

            // Assert
            expect(result).toBe('/users/123/sessions?limit=10');
        });

        it('should skip null parameters', () => {
            // Arrange
            const template = '/users{?filter,sort}';
            const params = { filter: 'active', sort: null };

            // Act
            const result = navigator.expandTemplate(template, params);

            // Assert
            expect(result).toBe('/users?filter=active');
        });

        it('should URL encode parameter values', () => {
            // Arrange
            const template = '/search{?q}';
            const params = { q: 'hello world & stuff' };

            // Act
            const result = navigator.expandTemplate(template, params);

            // Assert
            expect(result).toBe('/search?q=hello%20world%20%26%20stuff');
        });

        it('should handle empty query parameters gracefully', () => {
            // Arrange
            const template = '/users{?limit,offset}';
            const params = {}; // No params provided

            // Act
            const result = navigator.expandTemplate(template, params);

            // Assert
            expect(result).toBe('/users');
        });

        it('should preserve unmatched template variables', () => {
            // Arrange
            const template = '/users/{userId}/sessions/{sessionId}';
            const params = { userId: '123' }; // sessionId not provided

            // Act
            const result = navigator.expandTemplate(template, params);

            // Assert
            expect(result).toBe('/users/123/sessions/{sessionId}');
        });

        it('should handle query continuation parameters', () => {
            // Arrange
            const template = '/search?default=true{&filter,sort}';
            const params = { filter: 'active', sort: 'name' };

            // Act
            const result = navigator.expandTemplate(template, params);

            // Assert
            expect(result).toBe('/search?default=true&filter=active&sort=name');
        });

        it('should handle numeric parameter values', () => {
            // Arrange
            const template = '/users/{userId}/posts{?page,limit}';
            const params = { userId: 123, page: 1, limit: 20 };

            // Act
            const result = navigator.expandTemplate(template, params);

            // Assert
            expect(result).toBe('/users/123/posts?page=1&limit=20');
        });

        it('should handle boolean parameter values', () => {
            // Arrange
            const template = '/users{?active,admin}';
            const params = { active: true, admin: false };

            // Act
            const result = navigator.expandTemplate(template, params);

            // Assert
            expect(result).toBe('/users?active=true&admin=false');
        });
    });

    describe('getAllLinks', () => {
        it('should return all links from a resource', () => {
            // Arrange
            const resource: HalObject = {
                _links: {
                    self: { href: '/users/123' },
                    sessions: { href: '/users/123/sessions' },
                    'api-keys': { href: '/users/123/api-keys' },
                },
            };

            // Act
            const links = navigator.getAllLinks(resource);

            // Assert
            expect(Object.keys(links)).toHaveLength(3);
            expect(links.self).toBeDefined();
            expect(links.sessions).toBeDefined();
            expect(links['api-keys']).toBeDefined();
        });

        it('should return empty object if no links', () => {
            // Arrange
            const resource: HalObject = {};

            // Act
            const links = navigator.getAllLinks(resource);

            // Assert
            expect(links).toEqual({});
        });
    });

    describe('isTemplated', () => {
        it('should return true for templated links', () => {
            // Arrange
            const link: HalLink = {
                href: '/users/{userId}',
                templated: true,
            };

            // Act
            const result = navigator.isTemplated(link);

            // Assert
            expect(result).toBe(true);
        });

        it('should return false for non-templated links', () => {
            // Arrange
            const link: HalLink = {
                href: '/users/123',
            };

            // Act
            const result = navigator.isTemplated(link);

            // Assert
            expect(result).toBe(false);
        });

        it('should return false if templated is explicitly false', () => {
            // Arrange
            const link: HalLink = {
                href: '/users/123',
                templated: false,
            };

            // Act
            const result = navigator.isTemplated(link);

            // Assert
            expect(result).toBe(false);
        });
    });

    describe('findLinkByType', () => {
        it('should find link matching expected type', () => {
            // Arrange
            const resource: HalObject = {
                _links: {
                    alternate: {
                        href: '/api/users/123',
                        type: 'application/json',
                    },
                },
            };

            // Act
            const link = navigator.findLinkByType(resource, 'alternate', 'application/json');

            // Assert
            expect(link).toBeDefined();
            expect(link?.href).toBe('/api/users/123');
        });

        it('should return undefined if type does not match', () => {
            // Arrange
            const resource: HalObject = {
                _links: {
                    alternate: {
                        href: '/api/users/123',
                        type: 'application/xml',
                    },
                },
            };

            // Act
            const link = navigator.findLinkByType(resource, 'alternate', 'application/json');

            // Assert
            expect(link).toBeUndefined();
        });

        it('should return link if no type specified on link', () => {
            // Arrange
            const resource: HalObject = {
                _links: {
                    self: { href: '/users/123' },
                },
            };

            // Act
            const link = navigator.findLinkByType(resource, 'self', 'application/json');

            // Assert
            expect(link).toBeDefined();
            expect(link?.href).toBe('/users/123');
        });

        it('should return undefined if link not found', () => {
            // Arrange
            const resource: HalObject = {
                _links: {
                    self: { href: '/users/123' },
                },
            };

            // Act
            const link = navigator.findLinkByType(resource, 'nonexistent', 'application/json');

            // Assert
            expect(link).toBeUndefined();
        });
    });

    describe('getAvailableRelations', () => {
        it('should return all available link relations', () => {
            // Arrange
            const resource: HalObject = {
                _links: {
                    self: { href: '/users/123' },
                    sessions: { href: '/users/123/sessions' },
                    'api-keys': { href: '/users/123/api-keys' },
                    update: { href: '/users/123' },
                    delete: { href: '/users/123' },
                },
            };

            // Act
            const relations = navigator.getAvailableRelations(resource);

            // Assert
            expect(relations).toHaveLength(5);
            expect(relations).toContain('self');
            expect(relations).toContain('sessions');
            expect(relations).toContain('api-keys');
            expect(relations).toContain('update');
            expect(relations).toContain('delete');
        });

        it('should return empty array if no links', () => {
            // Arrange
            const resource: HalObject = {};

            // Act
            const relations = navigator.getAvailableRelations(resource);

            // Assert
            expect(relations).toEqual([]);
        });

        it('should return empty array for resource with empty _links', () => {
            // Arrange
            const resource: HalObject = {
                _links: {},
            };

            // Act
            const relations = navigator.getAvailableRelations(resource);

            // Assert
            expect(relations).toEqual([]);
        });
    });

    describe('real-world scenarios', () => {
        it('should handle user resource with full hypermedia', () => {
            // Arrange
            const user: HalObject = {
                userId: '123',
                email: 'test@example.com',
                _links: {
                    self: { href: '/users/123' },
                    sessions: { href: '/users/123/sessions' },
                    'api-keys': { href: '/users/123/api-keys' },
                    update: { href: '/users/123', title: 'Update User' },
                    delete: { href: '/users/123', title: 'Delete User' },
                },
            };

            // Act & Assert - Check capabilities
            expect(navigator.hasCapability(user, 'sessions')).toBe(true);
            expect(navigator.hasCapability(user, 'api-keys')).toBe(true);
            expect(navigator.hasCapability(user, 'update')).toBe(true);
            expect(navigator.hasCapability(user, 'delete')).toBe(true);

            // Get hrefs
            expect(navigator.getHref(user, 'sessions')).toBe('/users/123/sessions');
            expect(navigator.getHref(user, 'api-keys')).toBe('/users/123/api-keys');
        });

        it('should handle pagination links with templates', () => {
            // Arrange
            const collection: HalObject = {
                _links: {
                    self: { href: '/users?page=1&limit=10' },
                    next: {
                        href: '/users{?page,limit}',
                        templated: true,
                    },
                    prev: {
                        href: '/users{?page,limit}',
                        templated: true,
                    },
                },
            };

            // Act
            const nextHref = navigator.getHref(collection, 'next', { page: 2, limit: 10 });
            const prevHref = navigator.getHref(collection, 'prev', { page: 0, limit: 10 });

            // Assert
            expect(nextHref).toBe('/users?page=2&limit=10');
            expect(prevHref).toBe('/users?page=0&limit=10');
        });

        it('should handle error resource with sitemap link', () => {
            // Arrange
            const error: HalObject = {
                status: 404,
                title: 'Not Found',
                detail: 'User not found',
                _links: {
                    sitemap: { href: '/', title: 'API Entry Point' },
                    home: { href: '/', title: 'Home' },
                },
            };

            // Act
            const sitemapHref = navigator.getHref(error, ['sitemap', 'home']);

            // Assert
            expect(sitemapHref).toBe('/');
            expect(navigator.hasCapability(error, 'sitemap')).toBe(true);
        });
    });
});
