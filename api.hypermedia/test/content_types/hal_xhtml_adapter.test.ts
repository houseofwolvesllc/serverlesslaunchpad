import { describe, it, expect } from 'vitest';
import { HalXhtmlAdapter } from '../../src/content_types/hal_xhtml_adapter';
import { ResponseData } from '../../src/base_controller';

describe('HalXhtmlAdapter', () => {
    const adapter = new HalXhtmlAdapter();

    describe('format', () => {
        it('should render HAL object with toJSON method as XHTML', () => {
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

            // Check XHTML structure
            expect(result).toContain('<!DOCTYPE html>');
            expect(result).toContain('<html xmlns="http://www.w3.org/1999/xhtml"');
            expect(result).toContain('<article class="hal-resource"');

            // Check properties are rendered
            expect(result).toContain('userId');
            expect(result).toContain('123');
            expect(result).toContain('email');
            expect(result).toContain('test@example.com');
        });

        it('should render _links as navigation', () => {
            const halObject = {
                _links: {
                    self: { href: '/users/123', title: 'Self' },
                    update: { href: '/users/123', title: 'Update User' },
                    delete: { href: '/users/123', title: 'Delete User' }
                },
                toJSON: function() {
                    return { _links: this._links };
                }
            };

            const response: ResponseData = {
                status: 200,
                data: halObject
            };

            const result = adapter.format(response);

            // Check links section
            expect(result).toContain('<nav class="hal-links"');
            expect(result).toContain('<h3>Links</h3>');
            expect(result).toContain('href="/users/123"');
            expect(result).toContain('rel="update"');
            expect(result).toContain('Update User');
        });

        it('should render _embedded resources', () => {
            const halObject = {
                count: 2,
                _embedded: {
                    users: [
                        {
                            userId: '1',
                            email: 'user1@example.com',
                            _links: { self: { href: '/users/1' } }
                        },
                        {
                            userId: '2',
                            email: 'user2@example.com',
                            _links: { self: { href: '/users/2' } }
                        }
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

            // Check embedded section
            expect(result).toContain('<section class="hal-embedded"');
            expect(result).toContain('Embedded: users');
            expect(result).toContain('<article class="hal-embedded-item"');
            expect(result).toContain('user1@example.com');
            expect(result).toContain('user2@example.com');
        });

        it('should render _templates as HTML forms', () => {
            const halObject = {
                _templates: {
                    create: {
                        method: 'POST',
                        target: '/users',
                        title: 'Create User',
                        properties: [
                            { name: 'email', type: 'email', required: true, prompt: 'Email Address' },
                            { name: 'password', type: 'password', required: true, prompt: 'Password' }
                        ]
                    }
                },
                toJSON: function() {
                    return { _templates: this._templates };
                }
            };

            const response: ResponseData = {
                status: 200,
                data: halObject
            };

            const result = adapter.format(response);

            // Check templates section
            expect(result).toContain('<section class="hal-templates"');
            expect(result).toContain('<h3>Operations</h3>');
            expect(result).toContain('<form class="hal-template"');
            expect(result).toContain('action="/users"');
            expect(result).toContain('data-method="post"');
            expect(result).toContain('Email Address');
            expect(result).toContain('type="email"');
            expect(result).toContain('name="email"');
            expect(result).toContain('required="required"');
        });

        it('should render template with select options', () => {
            const halObject = {
                _templates: {
                    update: {
                        method: 'PUT',
                        target: '/users/123',
                        title: 'Update Role',
                        properties: [
                            {
                                name: 'role',
                                required: true,
                                prompt: 'User Role',
                                options: [
                                    { value: 'admin', prompt: 'Administrator' },
                                    { value: 'user', prompt: 'Regular User' }
                                ]
                            }
                        ]
                    }
                },
                toJSON: function() {
                    return { _templates: this._templates };
                }
            };

            const response: ResponseData = {
                status: 200,
                data: halObject
            };

            const result = adapter.format(response);

            // Check select field
            expect(result).toContain('<select name="role"');
            expect(result).toContain('<option value="admin">Administrator</option>');
            expect(result).toContain('<option value="user">Regular User</option>');
        });

        it('should render template with textarea', () => {
            const halObject = {
                _templates: {
                    create: {
                        method: 'POST',
                        target: '/notes',
                        title: 'Create Note',
                        properties: [
                            {
                                name: 'content',
                                type: 'textarea',
                                required: true,
                                prompt: 'Note Content'
                            }
                        ]
                    }
                },
                toJSON: function() {
                    return { _templates: this._templates };
                }
            };

            const response: ResponseData = {
                status: 200,
                data: halObject
            };

            const result = adapter.format(response);

            // Check textarea
            expect(result).toContain('<textarea name="content"');
            expect(result).toContain('Note Content');
        });

        it('should handle error responses', () => {
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

            // Check error structure
            expect(result).toContain('<!DOCTYPE html>');
            expect(result).toContain('Error: Not Found');
            expect(result).toContain('404');
            expect(result).toContain('User not found');
            expect(result).toContain('trace-123');
        });

        it('should handle error with violations', () => {
            const response: ResponseData = {
                error: {
                    status: 400,
                    title: 'Validation Error',
                    detail: 'Invalid input',
                    violations: [
                        { field: 'email', message: 'Invalid email format' },
                        { field: 'password', message: 'Password too short' }
                    ]
                }
            };

            const result = adapter.format(response);

            // Check violations
            expect(result).toContain('Violations');
            expect(result).toContain('email');
            expect(result).toContain('Invalid email format');
            expect(result).toContain('password');
            expect(result).toContain('Password too short');
        });

        it('should escape HTML entities for XSS protection', () => {
            const halObject = {
                name: '<script>alert("xss")</script>',
                description: 'Test & "quotes"',
                _links: {
                    self: { href: '/test', title: '<img src=x onerror=alert(1)>' }
                },
                toJSON: function() {
                    return {
                        name: this.name,
                        description: this.description,
                        _links: this._links
                    };
                }
            };

            const response: ResponseData = {
                status: 200,
                data: halObject
            };

            const result = adapter.format(response);

            // Check entities are escaped
            expect(result).toContain('&lt;script&gt;');
            expect(result).toContain('&amp;');
            expect(result).toContain('&quot;');
            expect(result).not.toContain('<script>');
            expect(result).not.toContain('<img src=');
        });

        it('should format dates in ISO format', () => {
            const halObject = {
                createdAt: '2025-10-29T12:00:00Z',
                updatedAt: '2025-10-29T13:00:00Z',
                toJSON: function() {
                    return {
                        createdAt: this.createdAt,
                        updatedAt: this.updatedAt
                    };
                }
            };

            const response: ResponseData = {
                status: 200,
                data: halObject
            };

            const result = adapter.format(response);

            // Check time elements for dates
            expect(result).toContain('<time datetime="2025-10-29T12:00:00Z"');
            expect(result).toContain('<time datetime="2025-10-29T13:00:00Z"');
        });

        it('should handle arrays and objects as JSON', () => {
            const halObject = {
                tags: ['tag1', 'tag2', 'tag3'],
                metadata: { key1: 'value1', key2: 'value2' },
                toJSON: function() {
                    return {
                        tags: this.tags,
                        metadata: this.metadata
                    };
                }
            };

            const response: ResponseData = {
                status: 200,
                data: halObject
            };

            const result = adapter.format(response);

            // Check code elements for complex values
            expect(result).toContain('<code>');
            expect(result).toContain('tag1');
            expect(result).toContain('key1');
        });

        it('should handle null and undefined values', () => {
            const halObject = {
                nullValue: null,
                undefinedValue: undefined,
                emptyString: '',
                toJSON: function() {
                    return {
                        nullValue: this.nullValue,
                        undefinedValue: this.undefinedValue,
                        emptyString: this.emptyString
                    };
                }
            };

            const response: ResponseData = {
                status: 200,
                data: halObject
            };

            const result = adapter.format(response);

            // Check null rendering
            expect(result).toContain('<em>null</em>');
        });

        it('should include CSS styles', () => {
            const halObject = {
                _links: { self: { href: '/test' } },
                toJSON: function() {
                    return { _links: this._links };
                }
            };

            const response: ResponseData = {
                status: 200,
                data: halObject
            };

            const result = adapter.format(response);

            // Check styles are embedded
            expect(result).toContain('<style>');
            expect(result).toContain('.hal-resource');
            expect(result).toContain('.hal-links');
            expect(result).toContain('.hal-templates');
        });

        it('should extract title from HAL object', () => {
            const halObject = {
                title: 'My Custom Title',
                _links: { self: { href: '/test' } },
                toJSON: function() {
                    return {
                        title: this.title,
                        _links: this._links
                    };
                }
            };

            const response: ResponseData = {
                status: 200,
                data: halObject
            };

            const result = adapter.format(response);

            // Check title
            expect(result).toContain('<title>My Custom Title</title>');
        });

        it('should handle non-HAL objects', () => {
            const response: ResponseData = {
                status: 200,
                data: { message: 'Success', count: 42 }
            };

            const result = adapter.format(response);

            // Should render as simple response
            expect(result).toContain('<!DOCTYPE html>');
            expect(result).toContain('<title>Response</title>');
            expect(result).toContain('message');
            expect(result).toContain('Success');
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

            // Should still render as HAL
            expect(result).toContain('<article class="hal-resource"');
            expect(result).toContain('userId');
            expect(result).toContain('123');
            expect(result).toContain('<nav class="hal-links"');
        });
    });
});
