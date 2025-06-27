import { describe, it, expect, beforeEach } from 'vitest';
import { Router, Route, HttpMethod } from '../src/router.js';

// Test controller classes
class TestController {
    @Route('GET', '/test')
    testMethod() {
        return 'test';
    }

    @Route('GET', '/users/{userId}')
    getUserById() {
        return 'user';
    }

    @Route('GET', '/users/{userId}/sessions/{sessionId}')
    getSessionById() {
        return 'session';
    }

    @Route('GET', '/users/{userId}/sessions/active')
    getActiveSessions() {
        return 'active sessions';
    }

    @Route('POST', '/users/{userId}/sessions')
    createSession() {
        return 'create session';
    }
}

class AnotherController {
    @Route('GET', '/health')
    healthCheck() {
        return 'healthy';
    }

    @Route('DELETE', '/users/{userId}/sessions/{sessionId}')
    deleteSession() {
        return 'delete session';
    }
}

describe('Router', () => {
    let router: Router;

    beforeEach(() => {
        router = new Router();
    });

    describe('Route registration', () => {
        it('should register routes from controller classes', () => {
            router.registerRoutes([TestController, AnotherController]);
            const routes = router.getRoutes();

            expect(routes).toHaveLength(7);
            
            // Check that all routes are registered
            const routePaths = routes.map(r => `${r.method} ${r.path}`);
            expect(routePaths).toContain('GET /test');
            expect(routePaths).toContain('GET /users/{userId}');
            expect(routePaths).toContain('GET /users/{userId}/sessions/{sessionId}');
            expect(routePaths).toContain('GET /users/{userId}/sessions/active');
            expect(routePaths).toContain('POST /users/{userId}/sessions');
            expect(routePaths).toContain('GET /health');
            expect(routePaths).toContain('DELETE /users/{userId}/sessions/{sessionId}');
        });

        it('should store correct metadata for each route', () => {
            router.registerRoutes([TestController]);
            const routes = router.getRoutes();

            const testRoute = routes.find(r => r.path === '/test');
            expect(testRoute).toBeDefined();
            expect(testRoute!.method).toBe('GET');
            expect(testRoute!.controllerClass).toBe(TestController);
            expect(testRoute!.methodName).toBe('testMethod');
            expect(testRoute!.parameterNames).toEqual([]);
            expect(testRoute!.literalSegmentCount).toBe(1);
        });

        it('should extract parameter names correctly', () => {
            router.registerRoutes([TestController]);
            const routes = router.getRoutes();

            const userRoute = routes.find(r => r.path === '/users/{userId}');
            expect(userRoute!.parameterNames).toEqual(['userId']);

            const sessionRoute = routes.find(r => r.path === '/users/{userId}/sessions/{sessionId}');
            expect(sessionRoute!.parameterNames).toEqual(['userId', 'sessionId']);
        });

        it('should count literal segments correctly', () => {
            router.registerRoutes([TestController]);
            const routes = router.getRoutes();

            const testRoute = routes.find(r => r.path === '/test');
            expect(testRoute!.literalSegmentCount).toBe(1);

            const userRoute = routes.find(r => r.path === '/users/{userId}');
            expect(userRoute!.literalSegmentCount).toBe(1);

            const activeRoute = routes.find(r => r.path === '/users/{userId}/sessions/active');
            expect(activeRoute!.literalSegmentCount).toBe(3);

            const sessionRoute = routes.find(r => r.path === '/users/{userId}/sessions/{sessionId}');
            expect(sessionRoute!.literalSegmentCount).toBe(2);
        });
    });

    describe('Route sorting by specificity', () => {
        it('should sort routes by specificity (more literal segments first)', () => {
            router.registerRoutes([TestController]);
            const routes = router.getRoutes();

            // Find GET routes to compare ordering
            const getRoutes = routes.filter(r => r.method === 'GET');
            
            // More specific route should come first
            const activeRoute = getRoutes.find(r => r.path === '/users/{userId}/sessions/active');
            const sessionRoute = getRoutes.find(r => r.path === '/users/{userId}/sessions/{sessionId}');
            
            const activeIndex = getRoutes.indexOf(activeRoute!);
            const sessionIndex = getRoutes.indexOf(sessionRoute!);
            
            expect(activeIndex).toBeLessThan(sessionIndex);
        });

        it('should sort by method name for consistent ordering', () => {
            router.registerRoutes([TestController, AnotherController]);
            const routes = router.getRoutes();

            // Methods should be consistently ordered
            const methods = routes.map(r => r.method);
            const uniqueMethods = [...new Set(methods)];
            const sortedMethods = [...uniqueMethods].sort((a, b) => a.localeCompare(b));
            
            expect(uniqueMethods).toEqual(sortedMethods);
        });
    });

    describe('Path to regex conversion', () => {
        it('should convert simple paths to regex', () => {
            router.registerRoutes([TestController]);
            const routes = router.getRoutes();

            const testRoute = routes.find(r => r.path === '/test');
            expect(testRoute!.regex.test('/test')).toBe(true);
            expect(testRoute!.regex.test('/test/extra')).toBe(false);
            expect(testRoute!.regex.test('/tes')).toBe(false);
        });

        it('should convert parameterized paths to regex', () => {
            router.registerRoutes([TestController]);
            const routes = router.getRoutes();

            const userRoute = routes.find(r => r.path === '/users/{userId}');
            expect(userRoute!.regex.test('/users/123')).toBe(true);
            expect(userRoute!.regex.test('/users/abc-def')).toBe(true);
            expect(userRoute!.regex.test('/users/123/extra')).toBe(false);
            expect(userRoute!.regex.test('/users')).toBe(false);
            expect(userRoute!.regex.test('/users/')).toBe(false);
        });

        it('should handle multiple parameters', () => {
            router.registerRoutes([TestController]);
            const routes = router.getRoutes();

            const sessionRoute = routes.find(r => r.path === '/users/{userId}/sessions/{sessionId}');
            expect(sessionRoute!.regex.test('/users/123/sessions/456')).toBe(true);
            expect(sessionRoute!.regex.test('/users/abc/sessions/def-ghi')).toBe(true);
            expect(sessionRoute!.regex.test('/users/123/sessions')).toBe(false);
            expect(sessionRoute!.regex.test('/users/123/sessions/456/extra')).toBe(false);
        });

        it('should handle mixed literal and parameter segments', () => {
            router.registerRoutes([TestController]);
            const routes = router.getRoutes();

            const activeRoute = routes.find(r => r.path === '/users/{userId}/sessions/active');
            expect(activeRoute!.regex.test('/users/123/sessions/active')).toBe(true);
            expect(activeRoute!.regex.test('/users/abc/sessions/active')).toBe(true);
            expect(activeRoute!.regex.test('/users/123/sessions/inactive')).toBe(false);
            expect(activeRoute!.regex.test('/users/123/sessions/active/extra')).toBe(false);
        });
    });

    describe('Route matching', () => {
        beforeEach(() => {
            router.registerRoutes([TestController, AnotherController]);
        });

        it('should match exact routes', () => {
            const match = router.match('GET', '/test');
            
            expect(match).toBeDefined();
            expect(match!.route.path).toBe('/test');
            expect(match!.route.methodName).toBe('testMethod');
            expect(match!.parameters).toEqual({});
        });

        it('should match routes with parameters', () => {
            const match = router.match('GET', '/users/123');
            
            expect(match).toBeDefined();
            expect(match!.route.path).toBe('/users/{userId}');
            expect(match!.route.methodName).toBe('getUserById');
            expect(match!.parameters).toEqual({ userId: '123' });
        });

        it('should match routes with multiple parameters', () => {
            const match = router.match('GET', '/users/123/sessions/456');
            
            expect(match).toBeDefined();
            expect(match!.route.path).toBe('/users/{userId}/sessions/{sessionId}');
            expect(match!.route.methodName).toBe('getSessionById');
            expect(match!.parameters).toEqual({ userId: '123', sessionId: '456' });
        });

        it('should prefer more specific routes', () => {
            // Should match the specific "active" route, not the parameterized route
            const match = router.match('GET', '/users/123/sessions/active');
            
            expect(match).toBeDefined();
            expect(match!.route.path).toBe('/users/{userId}/sessions/active');
            expect(match!.route.methodName).toBe('getActiveSessions');
            expect(match!.parameters).toEqual({ userId: '123' });
        });

        it('should match different HTTP methods', () => {
            const getMatch = router.match('GET', '/users/123/sessions/456');
            const deleteMatch = router.match('DELETE', '/users/123/sessions/456');
            
            expect(getMatch!.route.methodName).toBe('getSessionById');
            expect(deleteMatch!.route.methodName).toBe('deleteSession');
        });

        it('should return null for non-matching routes', () => {
            const match = router.match('GET', '/nonexistent');
            expect(match).toBeNull();
        });

        it('should return null for wrong HTTP method', () => {
            const match = router.match('PUT', '/test');
            expect(match).toBeNull();
        });

        it('should decode URL parameters', () => {
            const match = router.match('GET', '/users/user%20with%20spaces');
            
            expect(match).toBeDefined();
            expect(match!.parameters.userId).toBe('user with spaces');
        });
    });

    describe('Parameter extraction', () => {
        beforeEach(() => {
            router.registerRoutes([TestController]);
        });

        it('should extract single parameters', () => {
            const match = router.match('GET', '/users/user123');
            
            expect(match!.parameters).toEqual({ userId: 'user123' });
        });

        it('should extract multiple parameters', () => {
            const match = router.match('GET', '/users/user123/sessions/session456');
            
            expect(match!.parameters).toEqual({
                userId: 'user123',
                sessionId: 'session456'
            });
        });

        it('should handle special characters in parameters', () => {
            const match = router.match('GET', '/users/user-123_test');
            
            expect(match!.parameters.userId).toBe('user-123_test');
        });

        it('should handle URL encoded parameters', () => {
            const match = router.match('GET', '/users/user%40example.com');
            
            expect(match!.parameters.userId).toBe('user@example.com');
        });
    });

    describe('Edge cases', () => {
        it('should handle empty controller list', () => {
            router.registerRoutes([]);
            const routes = router.getRoutes();
            
            expect(routes).toHaveLength(0);
        });

        it('should handle controllers with no routes', () => {
            class EmptyController {}
            
            router.registerRoutes([EmptyController]);
            const routes = router.getRoutes();
            
            expect(routes).toHaveLength(0);
        });

        it('should handle root path', () => {
            class RootController {
                @Route('GET', '/')
                root() {
                    return 'root';
                }
            }
            
            router.registerRoutes([RootController]);
            const match = router.match('GET', '/');
            
            expect(match).toBeDefined();
            expect(match!.route.path).toBe('/');
        });

        it('should handle paths with trailing slashes', () => {
            const match = router.match('GET', '/test/');
            expect(match).toBeNull(); // Should not match '/test' route
        });

        it('should handle case sensitivity', () => {
            const match = router.match('get' as HttpMethod, '/test');
            expect(match).toBeNull(); // Should not match due to case sensitivity
        });
    });
});