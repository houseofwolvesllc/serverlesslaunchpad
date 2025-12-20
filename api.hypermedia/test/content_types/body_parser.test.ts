import { describe, it, expect } from 'vitest';
import { parseRequestBody, getContentType } from '../../src/content_types/body_parser';
import { ExtendedALBEvent } from '../../src/extended_alb_event';

describe('Body Parser', () => {
    describe('getContentType', () => {
        it('should return application/json as default', () => {
            const event = {
                headers: {}
            } as ExtendedALBEvent;

            expect(getContentType(event)).toBe('application/json');
        });

        it('should extract content type from lowercase header', () => {
            const event = {
                headers: {
                    'content-type': 'application/x-www-form-urlencoded'
                }
            } as ExtendedALBEvent;

            expect(getContentType(event)).toBe('application/x-www-form-urlencoded');
        });

        it('should extract content type from capitalized header', () => {
            const event = {
                headers: {
                    'Content-Type': 'application/json'
                }
            } as ExtendedALBEvent;

            expect(getContentType(event)).toBe('application/json');
        });

        it('should strip charset from content type', () => {
            const event = {
                headers: {
                    'content-type': 'application/json; charset=UTF-8'
                }
            } as ExtendedALBEvent;

            expect(getContentType(event)).toBe('application/json');
        });

        it('should handle multipart/form-data with boundary', () => {
            const event = {
                headers: {
                    'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary'
                }
            } as ExtendedALBEvent;

            expect(getContentType(event)).toBe('multipart/form-data');
        });
    });

    describe('parseRequestBody', () => {
        describe('JSON parsing', () => {
            it('should parse JSON body', () => {
                const event = {
                    headers: {
                        'content-type': 'application/json'
                    },
                    body: JSON.stringify({ name: 'Test', age: 30 })
                } as ExtendedALBEvent;

                const result = parseRequestBody(event);

                expect(result.data).toEqual({ name: 'Test', age: 30 });
                expect(result.contentType).toBe('application/json');
                expect(result.method).toBeUndefined();
            });

            it('should extract _method from JSON body', () => {
                const event = {
                    headers: {
                        'content-type': 'application/json'
                    },
                    body: JSON.stringify({ name: 'Test', _method: 'DELETE' })
                } as ExtendedALBEvent;

                const result = parseRequestBody(event);

                expect(result.data).toEqual({ name: 'Test' });
                expect(result.method).toBe('delete');
            });

            it('should handle empty body', () => {
                const event = {
                    headers: {
                        'content-type': 'application/json'
                    },
                    body: ''
                } as ExtendedALBEvent;

                const result = parseRequestBody(event);

                expect(result.data).toEqual({});
                expect(result.contentType).toBe('application/json');
            });

            it('should handle malformed JSON', () => {
                const event = {
                    headers: {
                        'content-type': 'application/json'
                    },
                    body: 'not valid json'
                } as ExtendedALBEvent;

                const result = parseRequestBody(event);

                expect(result.data).toEqual({ body: 'not valid json' });
            });
        });

        describe('Form-urlencoded parsing', () => {
            it('should parse simple key-value pairs', () => {
                const event = {
                    headers: {
                        'content-type': 'application/x-www-form-urlencoded'
                    },
                    body: 'name=Test&age=30'
                } as ExtendedALBEvent;

                const result = parseRequestBody(event);

                expect(result.data).toEqual({ name: 'Test', age: '30' });
                expect(result.contentType).toBe('application/x-www-form-urlencoded');
            });

            it('should parse nested objects', () => {
                const event = {
                    headers: {
                        'content-type': 'application/x-www-form-urlencoded'
                    },
                    body: 'user[name]=Test&user[age]=30'
                } as ExtendedALBEvent;

                const result = parseRequestBody(event);

                expect(result.data).toEqual({ user: { name: 'Test', age: '30' } });
            });

            it('should parse arrays with bracket notation', () => {
                const event = {
                    headers: {
                        'content-type': 'application/x-www-form-urlencoded'
                    },
                    body: 'ids[]=1&ids[]=2&ids[]=3'
                } as ExtendedALBEvent;

                const result = parseRequestBody(event);

                expect(result.data).toEqual({ ids: ['1', '2', '3'] });
            });

            it('should parse comma-separated values', () => {
                const event = {
                    headers: {
                        'content-type': 'application/x-www-form-urlencoded'
                    },
                    body: 'ids=1,2,3'
                } as ExtendedALBEvent;

                const result = parseRequestBody(event);

                expect(result.data).toEqual({ ids: '1,2,3' });
            });

            it('should extract _method field', () => {
                const event = {
                    headers: {
                        'content-type': 'application/x-www-form-urlencoded'
                    },
                    body: 'name=Test&_method=delete'
                } as ExtendedALBEvent;

                const result = parseRequestBody(event);

                expect(result.data).toEqual({ name: 'Test' });
                expect(result.method).toBe('delete');
            });

            it('should handle URL-encoded characters', () => {
                const event = {
                    headers: {
                        'content-type': 'application/x-www-form-urlencoded'
                    },
                    body: 'message=Hello+World&email=test%40example.com'
                } as ExtendedALBEvent;

                const result = parseRequestBody(event);

                expect(result.data).toEqual({
                    message: 'Hello World',
                    email: 'test@example.com'
                });
            });

            it('should handle empty values', () => {
                const event = {
                    headers: {
                        'content-type': 'application/x-www-form-urlencoded'
                    },
                    body: 'name=Test&description=&age=30'
                } as ExtendedALBEvent;

                const result = parseRequestBody(event);

                expect(result.data).toEqual({
                    name: 'Test',
                    description: '',
                    age: '30'
                });
            });

            it('should handle dev server pre-parsed JSON body with form-urlencoded content-type', () => {
                // Dev server scenario: Express parses form, then JSON.stringifies it
                const event = {
                    headers: {
                        'content-type': 'application/x-www-form-urlencoded'
                    },
                    body: JSON.stringify({ name: 'Test', _method: 'delete', sessionIds: 'abc123' })
                } as ExtendedALBEvent;

                const result = parseRequestBody(event);

                expect(result.data).toEqual({
                    name: 'Test',
                    sessionIds: 'abc123'
                });
                expect(result.method).toBe('delete');
                expect(result.contentType).toBe('application/x-www-form-urlencoded');
            });
        });
    });
});
