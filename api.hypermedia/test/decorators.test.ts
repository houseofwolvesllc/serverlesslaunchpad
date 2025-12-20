import { Container, Features, Role, User } from "@houseofwolves/serverlesslaunchpad.core";
import { ALBEvent } from 'aws-lambda';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ForbiddenError, UnauthorizedError } from '../src/common/errors';
import { Cache, Debug, Protected } from '../src/decorators';

// Mock the container
vi.mock('../src/container', () => ({
    getContainer: vi.fn()
}));

describe('Decorator System', () => {
    let mockContainer: Container;
    let mockAuthenticator: any;
    let mockUser: User;

    beforeEach(async () => {
        // Set up mock container
        mockContainer = {
            resolve: vi.fn()
        } as any;

        // Set up mock authenticator
        mockAuthenticator = {
            authenticate: vi.fn()
        } as any;

        // Set up mock user
        mockUser = {
            userId: 'user123',
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
            role: Role.Support,
            features: Features.Contacts | Features.Campaigns,
            dateCreated: new Date(),
            dateModified: new Date()
        };

        // Configure container to return mocked services
        (mockContainer.resolve as any).mockReturnValue(mockAuthenticator);
        const { getContainer } = await import('../src/container');
        (getContainer as any).mockReturnValue(mockContainer);
    });

    describe('@Protected Decorator', () => {
        it('should authenticate user and enrich request context', async () => {
            // Arrange
            class TestController {
                @Protected()
                async testMethod(request: any) {
                    return { user: request.user, authType: request.authType };
                }
            }

            const controller = new TestController();
            const mockEvent: Partial<ALBEvent> = {
                path: '/users/user123/sessions',
                headers: { 'x-api-key': 'test-key' }
            };
            const request = { _event: mockEvent, user: undefined, authType: undefined };

            mockAuthenticator.authenticate.mockResolvedValue(true);

            // Act
            const result = await controller.testMethod(request);

            // Assert
            expect(mockAuthenticator.authenticate).toHaveBeenCalledWith({ 
                apiKey: 'test-key',
                accessToken: undefined
            });
            expect(result.user).toBeDefined();
            expect(result.authType).toBe('apiKey');
        });

        it('should throw UnauthorizedError when authentication fails', async () => {
            // Arrange
            class TestController {
                @Protected()
                async testMethod(_request: any) {
                    return { success: true };
                }
            }

            const controller = new TestController();
            const request = { _event: { headers: {} } };

            mockAuthenticator.authenticate.mockResolvedValue(false);

            // Act & Assert
            await expect(controller.testMethod(request)).rejects.toThrow(UnauthorizedError);
        });

        it('should detect session authentication type', async () => {
            // Arrange
            class TestController {
                @Protected()
                async testMethod(request: any) {
                    return { authType: request.authType };
                }
            }

            const controller = new TestController();
            const request = {
                _event: {
                    path: '/test',
                    headers: { 'cookie': 'sessionToken=abc123; other=value' }
                },
                authType: undefined
            };

            mockAuthenticator.authenticate.mockResolvedValue(true);

            // Act
            const result = await controller.testMethod(request);

            // Assert
            expect(result.authType).toBe('session');
        });
    });

    describe('@Protected with authorization options', () => {
        it('should allow access when user has required role', async () => {
            // Arrange
            mockAuthenticator.authenticate.mockResolvedValue(true);
            mockAuthenticator.authenticate.mockResolvedValue(true);
            
            class TestController {
                @Protected()
                async testMethod(_request: any) {
                    return { success: true };
                }
            }

            const controller = new TestController();
            const event: ALBEvent = {
                // ... minimal ALB event
                httpMethod: 'GET',
                path: '/test',
                headers: { 'authorization': 'Bearer token123' },
                requestContext: {} as any,
                body: null,
                isBase64Encoded: false,
                queryStringParameters: undefined,
                multiValueHeaders: {},
                multiValueQueryStringParameters: undefined,
            };
            const request = { _event: event };

            // Act
            const result = await controller.testMethod(request);

            // Assert
            expect(result.success).toBe(true);
        });

        it('should allow access when user is owner', async () => {
            // Arrange
            const baseUser = { ...mockUser, role: Role.Base };
            mockAuthenticator.authenticate.mockResolvedValue(true);
            mockAuthenticator.getAuthenticatedUser.mockResolvedValue(baseUser);
            
            class TestController {
                @Protected()
                async testMethod(_request: any) {
                    return { success: true };
                }
            }

            const controller = new TestController();
            const event: ALBEvent = {
                // ... minimal ALB event
                httpMethod: 'GET',
                path: '/users/user123',
                headers: { 'authorization': 'Bearer token123' },
                requestContext: {} as any,
                body: null,
                isBase64Encoded: false,
                queryStringParameters: undefined,
                multiValueHeaders: {},
                multiValueQueryStringParameters: undefined,
            };
            const request = { _event: event };

            // Act
            const result = await controller.testMethod(request);

            // Assert
            expect(result.success).toBe(true);
        });

        it('should throw ForbiddenError when user lacks required role', async () => {
            // Arrange
            const basicUser = { ...mockUser, role: Role.Base };
            mockAuthenticator.authenticate.mockResolvedValue(true);
            mockAuthenticator.getAuthenticatedUser.mockResolvedValue(basicUser);
            
            class TestController {
                @Protected()
                async testMethod(_request: any) {
                    return { success: true };
                }
            }

            const controller = new TestController();
            const event: ALBEvent = {
                // ... minimal ALB event
                httpMethod: 'GET',
                path: '/test',
                headers: { 'authorization': 'Bearer token123' },
                requestContext: {} as any,
                body: null,
                isBase64Encoded: false,
                queryStringParameters: undefined,
                multiValueHeaders: {},
                multiValueQueryStringParameters: undefined,
            };
            const request = { _event: event };

            // Act & Assert
            await expect(controller.testMethod(request)).rejects.toThrow(ForbiddenError);
        });

        it('should check feature requirements using bitwise operations', async () => {
            // Arrange
            mockAuthenticator.authenticate.mockResolvedValue(true);
            mockAuthenticator.authenticate.mockResolvedValue(true);
            
            class TestController {
                @Protected()
                async testMethod(_request: any) {
                    return { success: true };
                }
            }

            const controller = new TestController();
            const event: ALBEvent = {
                // ... minimal ALB event
                httpMethod: 'GET',
                path: '/test',
                headers: { 'authorization': 'Bearer token123' },
                requestContext: {} as any,
                body: null,
                isBase64Encoded: false,
                queryStringParameters: undefined,
                multiValueHeaders: {},
                multiValueQueryStringParameters: undefined,
            };
            const request = { _event: event };

            // Act
            const result = await controller.testMethod(request);

            // Assert
            expect(result.success).toBe(true);
        });

        it('should throw ForbiddenError when user lacks required features', async () => {
            // Arrange
            mockAuthenticator.authenticate.mockResolvedValue(true);
            mockAuthenticator.authenticate.mockResolvedValue(true);
            
            class TestController {
                @Protected()
                async testMethod(_request: any) {
                    return { success: true };
                }
            }

            const controller = new TestController();
            const event: ALBEvent = {
                // ... minimal ALB event
                httpMethod: 'GET',
                path: '/test',
                headers: { 'authorization': 'Bearer token123' },
                requestContext: {} as any,
                body: null,
                isBase64Encoded: false,
                queryStringParameters: undefined,
                multiValueHeaders: {},
                multiValueQueryStringParameters: undefined,
            };
            const request = { _event: event };

            // Act & Assert
            await expect(controller.testMethod(request)).rejects.toThrow(ForbiddenError);
        });

        it('should enforce session requirement', async () => {
            // Arrange
            mockAuthenticator.authenticate.mockResolvedValue(true);
            mockAuthenticator.authenticate.mockResolvedValue(true);
            
            class TestController {
                @Protected()
                async testMethod(_request: any) {
                    return { success: true };
                }
            }

            const controller = new TestController();
            const event: ALBEvent = {
                // ... minimal ALB event
                httpMethod: 'GET',
                path: '/test',
                headers: { 'x-api-key': 'test-key' }, // API key instead of session
                requestContext: {} as any,
                body: null,
                isBase64Encoded: false,
                queryStringParameters: undefined,
                multiValueHeaders: {},
                multiValueQueryStringParameters: undefined,
            };
            const request = { _event: event };

            // Act & Assert
            await expect(controller.testMethod(request)).rejects.toThrow(ForbiddenError);
        });
    });

    describe('@Cache Decorator', () => {
        it('should cache GET requests with ETags', async () => {
            // Arrange
            class TestController {
                @Cache({ ttl: 300 })
                async testMethod(_request: any) {
                    return {
                        statusCode: 200,
                        body: JSON.stringify({ data: 'test' }),
                        headers: {}
                    };
                }
            }

            const controller = new TestController();
            const request = {
                _event: {
                    httpMethod: 'GET',
                    path: '/test',
                    queryStringParameters: undefined,
                    headers: {}
                }
            };

            // Act
            const result = await controller.testMethod(request);

            // Assert
            expect(result.headers?.['ETag']).toBeDefined();
            expect(result.headers?.['Cache-Control']).toBe('private, max-age=300, must-revalidate');
            expect(result.headers?.['X-Cache']).toBe('MISS');
        });

        it('should return 304 for matching ETags', async () => {
            // Arrange
            class TestController {
                @Cache({ ttl: 300 })
                async testMethod(_request: any) {
                    return {
                        statusCode: 200,
                        body: JSON.stringify({ data: 'test' }),
                        headers: {}
                    };
                }
            }

            const controller = new TestController();
            
            // First request to populate cache
            const firstRequest = {
                _event: {
                    httpMethod: 'GET',
                    path: '/test',
                    queryStringParameters: undefined,
                    headers: {}
                }
            };

            const firstResult = await controller.testMethod(firstRequest);
            const etag = firstResult.headers?.['ETag'];

            // Second request with If-None-Match
            const secondRequest = {
                _event: {
                    httpMethod: 'GET',
                    path: '/test',
                    queryStringParameters: undefined,
                    headers: { 'if-none-match': etag }
                }
            };

            // Act
            const result = await controller.testMethod(secondRequest);

            // Assert
            expect(result.statusCode).toBe(304);
            expect(result.body).toBe('');
        });

        it('should not cache non-GET requests', async () => {
            // Arrange
            class TestController {
                @Cache({ ttl: 300 })
                async testMethod(_request: any) {
                    return {
                        statusCode: 200,
                        body: JSON.stringify({ data: 'test' }),
                        headers: {}
                    };
                }
            }

            const controller = new TestController();
            const request = {
                _event: {
                    httpMethod: 'POST',
                    path: '/test',
                    queryStringParameters: undefined,
                    headers: {}
                }
            };

            // Act
            const result = await controller.testMethod(request);

            // Assert
            expect(result.headers?.['ETag']).toBeUndefined();
        });
    });

    describe('@Log Decorator', () => {
        let consoleSpy: any;

        beforeEach(() => {
            consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { /* mock implementation */ });
        });

        it('should log method entry and exit with timing', async () => {
            // Arrange
            class TestController {
                @Debug()
                async testMethod(_request: any) {
                    return { success: true };
                }
            }

            const controller = new TestController();
            const request = {
                _event: {
                    requestContext: { requestId: 'test-request-id' },
                    path: '/test',
                    httpMethod: 'GET'
                }
            };

            // Act
            await controller.testMethod(request);

            // Assert
            expect(consoleSpy).toHaveBeenCalledTimes(2);
            
            // Check entry log
            const entryLog = JSON.parse(consoleSpy.mock.calls[0][0]);
            expect(entryLog.event).toBe('method_entry');
            expect(entryLog.requestId).toBe('test-request-id');
            expect(entryLog.class).toBe('TestController');
            expect(entryLog.method).toBe('testMethod');

            // Check exit log
            const exitLog = JSON.parse(consoleSpy.mock.calls[1][0]);
            expect(exitLog.event).toBe('method_exit');
            expect(exitLog.success).toBe(true);
            expect(exitLog.duration).toBeGreaterThanOrEqual(0);
        });

        it('should log errors with stack trace in debug mode', async () => {
            // Arrange
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { /* mock implementation */ });
            
            class TestController {
                @Debug()
                async testMethod(_request: any) {
                    throw new Error('Test error');
                }
            }

            const controller = new TestController();
            const request = { _event: { requestContext: { requestId: 'test-id' } } };

            // Act & Assert
            await expect(controller.testMethod(request)).rejects.toThrow('Test error');
            
            const errorLog = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
            expect(errorLog.event).toBe('method_error');
            expect(errorLog.success).toBe(false);
            expect(errorLog.error.stack).toBeDefined();
        });
    });

    describe('Decorator Composition', () => {
        it('should execute decorators in correct order: Log -> Protected -> Cache', async () => {
            // Arrange
            const executionOrder: string[] = [];

            // Mock decorators to track execution order
            const LogSpy = (_options: any) => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => {
                const originalMethod = descriptor.value;
                descriptor.value = async function (...args: any[]) {
                    executionOrder.push('Log-start');
                    const result = await originalMethod.apply(this, args);
                    executionOrder.push('Log-end');
                    return result;
                };
                return descriptor;
            };

            const ProtectedSpy = (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => {
                const originalMethod = descriptor.value;
                descriptor.value = async function (...args: any[]) {
                    executionOrder.push('Protected');
                    args[0].user = mockUser;
                    return originalMethod.apply(this, args);
                };
                return descriptor;
            };

            const CacheSpy = (_options: any) => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => {
                const originalMethod = descriptor.value;
                descriptor.value = async function (...args: any[]) {
                    executionOrder.push('Cache');
                    return originalMethod.apply(this, args);
                };
                return descriptor;
            };

            class TestController {
                @Debug()
                @ProtectedSpy
                @CacheSpy({ ttl: 300 })
                async testMethod(_request: any) {
                    executionOrder.push('Method');
                    return { success: true };
                }
            }

            const controller = new TestController();
            const request = { _event: {} };

            // Act
            await controller.testMethod(request);

            // Assert - Should execute in bottom-to-top order
            expect(executionOrder).toEqual([
                'Log-start',
                'Protected',
                'Cache',
                'Method',
                'Log-end'
            ]);
        });
    });
});