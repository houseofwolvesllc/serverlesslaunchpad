import { describe, it, expect } from 'vitest';
import { HalJsonAdapter } from '../../src/content_types/hal_json_adapter';
import { ResponseData } from '../../src/base_controller';

describe('HalJsonAdapter', () => {
    const adapter = new HalJsonAdapter();

    describe('format', () => {
        it('should format HAL object with toJSON method', () => {
            const halObject = {
                userId: '123',
                email: 'test@example.com',
                _links: {
                    self: { href: '/users/123' }
                },
                toJSON: function() {
                    return {
                        userId: this.userId,
                        email: this.email,
                        _links: this._links
                    };
                }
            };

            const response: ResponseData = {
                status: 200,
                data: halObject
            };

            const result = adapter.format(response);
            const parsed = JSON.parse(result);

            expect(parsed).toEqual({
                userId: '123',
                email: 'test@example.com',
                _links: {
                    self: { href: '/users/123' }
                }
            });
        });

        it('should format HAL object with _links', () => {
            const halObject = {
                userId: '123',
                _links: {
                    self: { href: '/users/123' },
                    update: { href: '/users/123', title: 'Update User' }
                },
                toJSON: function() {
                    return {
                        userId: this.userId,
                        _links: this._links
                    };
                }
            };

            const response: ResponseData = {
                status: 200,
                data: halObject
            };

            const result = adapter.format(response);
            const parsed = JSON.parse(result);

            expect(parsed._links).toBeDefined();
            expect(parsed._links.self.href).toBe('/users/123');
            expect(parsed._links.update.title).toBe('Update User');
        });

        it('should format HAL object with _embedded', () => {
            const halObject = {
                count: 2,
                _embedded: {
                    users: [
                        { userId: '1', email: 'user1@example.com' },
                        { userId: '2', email: 'user2@example.com' }
                    ]
                },
                toJSON: function() {
                    return {
                        count: this.count,
                        _embedded: this._embedded
                    };
                }
            };

            const response: ResponseData = {
                status: 200,
                data: halObject
            };

            const result = adapter.format(response);
            const parsed = JSON.parse(result);

            expect(parsed._embedded).toBeDefined();
            expect(parsed._embedded.users).toHaveLength(2);
            expect(parsed._embedded.users[0].userId).toBe('1');
        });

        it('should format HAL object with _templates', () => {
            const halObject = {
                _templates: {
                    create: {
                        method: 'POST',
                        target: '/users',
                        title: 'Create User',
                        properties: [
                            { name: 'email', type: 'email', required: true }
                        ]
                    }
                },
                toJSON: function() {
                    return {
                        _templates: this._templates
                    };
                }
            };

            const response: ResponseData = {
                status: 200,
                data: halObject
            };

            const result = adapter.format(response);
            const parsed = JSON.parse(result);

            expect(parsed._templates).toBeDefined();
            expect(parsed._templates.create.method).toBe('POST');
            expect(parsed._templates.create.properties[0].name).toBe('email');
        });

        it('should handle error responses by delegating to base adapter', () => {
            const response: ResponseData = {
                error: {
                    status: 404,
                    title: 'Not Found',
                    detail: 'User not found',
                    instance: '/users/123',
                    timestamp: '2025-10-29T12:00:00Z',
                    traceId: 'trace-123'
                }
            };

            const result = adapter.format(response);
            const parsed = JSON.parse(result);

            // Base adapter formats error as object with HAL structure
            expect(parsed.status).toBe(404);
            expect(parsed.title).toBe('Not Found');
            expect(parsed.detail).toBe('User not found');
            expect(parsed._links).toBeDefined();
            expect(parsed._links.home.href).toBe('/');
        });

        it('should format pretty JSON with 2-space indentation', () => {
            const halObject = {
                userId: '123',
                _links: { self: { href: '/users/123' } },
                toJSON: function() {
                    return { userId: this.userId, _links: this._links };
                }
            };

            const response: ResponseData = {
                status: 200,
                data: halObject
            };

            const result = adapter.format(response);

            // Check for pretty printing (newlines and indentation)
            expect(result).toContain('\n');
            expect(result).toMatch(/  "userId"/); // 2-space indent
        });

        it('should handle HAL objects without toJSON method', () => {
            const response: ResponseData = {
                status: 200,
                data: {
                    userId: '123',
                    _links: { self: { href: '/users/123' } }
                }
            };

            const result = adapter.format(response);
            const parsed = JSON.parse(result);

            // Falls back to base adapter which just stringifies the object
            expect(parsed.userId).toBe('123');
            expect(parsed._links.self.href).toBe('/users/123');
        });
    });
});
