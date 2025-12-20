import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HalFormsClient } from '@houseofwolves/serverlesslaunchpad.web.commons';
import { ApiClient } from '@houseofwolves/serverlesslaunchpad.web.commons';
import { HalTemplate } from '../../src/types/hal';

describe('HalFormsClient', () => {
    let client: HalFormsClient;
    let mockApiClient: ApiClient;
    let mockRequest: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        mockRequest = vi.fn();
        mockApiClient = { request: mockRequest } as any;
        client = new HalFormsClient(mockApiClient);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('fetch', () => {
        it('should fetch HAL resources with correct headers', async () => {
            const mockData = { _links: {}, _templates: {} };
            mockRequest.mockResolvedValue(mockData);

            const result = await client.fetch('/test');

            expect(mockRequest).toHaveBeenCalledWith('/test', {
                method: 'GET',
                headers: {
                    Accept: 'application/hal+json',
                },
            });
            expect(result).toEqual(mockData);
        });

        it('should throw error if fetch fails', async () => {
            mockRequest.mockRejectedValue(new Error('Network error'));

            await expect(client.fetch('/test')).rejects.toThrow('Network error');
        });
    });

    describe('executeTemplate', () => {
        it('should execute POST template with JSON body', async () => {
            const template: HalTemplate = {
                title: 'Create',
                method: 'POST',
                target: '/users',
                contentType: 'application/json',
            };
            const data = { name: 'John' };
            const mockResult = { _links: {}, userId: '123' };
            mockRequest.mockResolvedValue(mockResult);

            const result = await client.executeTemplate(template, data);

            expect(mockRequest).toHaveBeenCalledWith('/users', {
                method: 'POST',
                headers: {
                    Accept: 'application/hal+json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });
            expect(result).toEqual(mockResult);
        });

        it('should execute DELETE template with method override', async () => {
            const template: HalTemplate = {
                title: 'Delete',
                method: 'DELETE',
                target: '/users/123',
            };
            const mockResult = { _links: {} };
            mockRequest.mockResolvedValue(mockResult);

            await client.executeTemplate(template, {});

            expect(mockRequest).toHaveBeenCalledWith('/users/123', {
                method: 'POST',
                headers: {
                    Accept: 'application/hal+json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ _method: 'delete' }),
            });
        });

        it('should execute PUT template with method override', async () => {
            const template: HalTemplate = {
                title: 'Update',
                method: 'PUT',
                target: '/users/123',
            };
            const data = { name: 'Jane' };
            const mockResult = { _links: {}, userId: '123' };
            mockRequest.mockResolvedValue(mockResult);

            await client.executeTemplate(template, data);

            expect(mockRequest).toHaveBeenCalledWith('/users/123', {
                method: 'POST',
                headers: {
                    Accept: 'application/hal+json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ...data, _method: 'put' }),
            });
        });

        it('should handle form-urlencoded content type', async () => {
            const template: HalTemplate = {
                title: 'Create',
                method: 'POST',
                target: '/users',
                contentType: 'application/x-www-form-urlencoded',
            };
            const data = { name: 'John', age: '30' };
            mockRequest.mockResolvedValue({});

            await client.executeTemplate(template, data);

            expect(mockRequest).toHaveBeenCalledWith('/users', {
                method: 'POST',
                headers: {
                    Accept: 'application/hal+json',
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: 'name=John&age=30',
            });
        });
    });

    describe('validateTemplateData', () => {
        it('should validate required fields', () => {
            const template: HalTemplate = {
                title: 'Test',
                method: 'POST',
                target: '/test',
                properties: [
                    { name: 'field1', required: true },
                    { name: 'field2', required: false },
                ],
            };

            const errors = client.validateTemplateData(template, { field2: 'value' });

            expect(errors).toHaveLength(1);
            expect(errors[0].field).toBe('field1');
            expect(errors[0].message).toContain('required');
        });

        it('should validate all data when all required fields present', () => {
            const template: HalTemplate = {
                title: 'Test',
                method: 'POST',
                target: '/test',
                properties: [
                    { name: 'field1', required: true },
                    { name: 'field2', required: true },
                ],
            };

            const errors = client.validateTemplateData(template, {
                field1: 'value1',
                field2: 'value2',
            });

            expect(errors).toHaveLength(0);
        });

        it('should validate min/max constraints for numbers', () => {
            const template: HalTemplate = {
                title: 'Test',
                method: 'POST',
                target: '/test',
                properties: [{ name: 'age', type: 'number', min: 18, max: 100 }],
            };

            const errors1 = client.validateTemplateData(template, { age: 15 });
            expect(errors1).toHaveLength(1);
            expect(errors1[0].message).toContain('at least 18');

            const errors2 = client.validateTemplateData(template, { age: 110 });
            expect(errors2).toHaveLength(1);
            expect(errors2[0].message).toContain('at most 100');

            const errors3 = client.validateTemplateData(template, { age: 25 });
            expect(errors3).toHaveLength(0);
        });

        it('should validate string length constraints', () => {
            const template: HalTemplate = {
                title: 'Test',
                method: 'POST',
                target: '/test',
                properties: [{ name: 'name', minLength: 3, maxLength: 10 }],
            };

            const errors1 = client.validateTemplateData(template, { name: 'ab' });
            expect(errors1).toHaveLength(1);
            expect(errors1[0].message).toContain('at least 3 characters');

            const errors2 = client.validateTemplateData(template, { name: 'abcdefghijk' });
            expect(errors2).toHaveLength(1);
            expect(errors2[0].message).toContain('at most 10 characters');

            const errors3 = client.validateTemplateData(template, { name: 'valid' });
            expect(errors3).toHaveLength(0);
        });

        it('should validate email format', () => {
            const template: HalTemplate = {
                title: 'Test',
                method: 'POST',
                target: '/test',
                properties: [{ name: 'email', type: 'email', required: true }],
            };

            const errors1 = client.validateTemplateData(template, { email: 'invalid' });
            expect(errors1).toHaveLength(1);
            expect(errors1[0].message).toContain('valid email');

            const errors2 = client.validateTemplateData(template, {
                email: 'test@example.com',
            });
            expect(errors2).toHaveLength(0);
        });

        it('should validate URL format', () => {
            const template: HalTemplate = {
                title: 'Test',
                method: 'POST',
                target: '/test',
                properties: [{ name: 'website', type: 'url' }],
            };

            const errors1 = client.validateTemplateData(template, { website: 'not-a-url' });
            expect(errors1).toHaveLength(1);
            expect(errors1[0].message).toContain('valid URL');

            const errors2 = client.validateTemplateData(template, {
                website: 'https://example.com',
            });
            expect(errors2).toHaveLength(0);
        });

        it('should validate regex patterns', () => {
            const template: HalTemplate = {
                title: 'Test',
                method: 'POST',
                target: '/test',
                properties: [{ name: 'code', regex: '^[A-Z]{3}$' }],
            };

            const errors1 = client.validateTemplateData(template, { code: 'abc' });
            expect(errors1).toHaveLength(1);
            expect(errors1[0].message).toContain('invalid format');

            const errors2 = client.validateTemplateData(template, { code: 'ABC' });
            expect(errors2).toHaveLength(0);
        });

        it('should not validate optional empty fields', () => {
            const template: HalTemplate = {
                title: 'Test',
                method: 'POST',
                target: '/test',
                properties: [
                    { name: 'optional', required: false, minLength: 5 },
                    { name: 'required', required: true },
                ],
            };

            const errors = client.validateTemplateData(template, { required: 'value' });
            expect(errors).toHaveLength(0);
        });

        it('should return empty array when no properties defined', () => {
            const template: HalTemplate = {
                title: 'Test',
                method: 'POST',
                target: '/test',
            };

            const errors = client.validateTemplateData(template, {});
            expect(errors).toHaveLength(0);
        });

        it('should use prompt in error messages when available', () => {
            const template: HalTemplate = {
                title: 'Test',
                method: 'POST',
                target: '/test',
                properties: [{ name: 'userEmail', prompt: 'Email Address', required: true }],
            };

            const errors = client.validateTemplateData(template, {});
            expect(errors[0].message).toContain('Email Address');
        });
    });
});
