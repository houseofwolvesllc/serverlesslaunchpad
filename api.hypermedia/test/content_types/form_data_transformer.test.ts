import { describe, it, expect } from 'vitest';
import { transformFormData, isArrayField, parseCommaSeparated } from '../../src/content_types/form_data_transformer';

describe('Form Data Transformer', () => {
    describe('transformFormData', () => {
        it('should transform comma-separated strings to arrays for Ids fields', () => {
            const formData = {
                apiKeyIds: 'abc123,def456,ghi789'
            };

            const result = transformFormData(formData);

            expect(result).toEqual({
                apiKeyIds: ['abc123', 'def456', 'ghi789']
            });
        });

        it('should transform comma-separated strings to arrays for List fields', () => {
            const formData = {
                userList: 'user1,user2,user3'
            };

            const result = transformFormData(formData);

            expect(result).toEqual({
                userList: ['user1', 'user2', 'user3']
            });
        });

        it('should transform boolean strings', () => {
            const formData = {
                isActive: 'true',
                isDeleted: 'false'
            };

            const result = transformFormData(formData);

            expect(result).toEqual({
                isActive: true,
                isDeleted: false
            });
        });

        it('should parse JSON strings', () => {
            const formData = {
                pagingInstruction: '{"cursor":"abc123","limit":10}'
            };

            const result = transformFormData(formData);

            expect(result).toEqual({
                pagingInstruction: {
                    cursor: 'abc123',
                    limit: 10
                }
            });
        });

        it('should parse JSON arrays', () => {
            const formData = {
                items: '[1,2,3,4,5]'
            };

            const result = transformFormData(formData);

            expect(result).toEqual({
                items: [1, 2, 3, 4, 5]
            });
        });

        it('should convert empty strings to undefined', () => {
            const formData = {
                name: 'Test',
                description: '',
                age: '30'
            };

            const result = transformFormData(formData);

            expect(result).toEqual({
                name: 'Test',
                description: undefined,
                age: '30'
            });
        });

        it('should preserve regular strings', () => {
            const formData = {
                name: 'Test User',
                email: 'test@example.com'
            };

            const result = transformFormData(formData);

            expect(result).toEqual({
                name: 'Test User',
                email: 'test@example.com'
            });
        });

        it('should handle arrays already parsed by qs', () => {
            const formData = {
                'ids[]': ['1', '2', '3']
            };

            const result = transformFormData(formData);

            expect(result).toEqual({
                ids: ['1', '2', '3']
            });
        });

        it('should recursively transform nested objects', () => {
            const formData = {
                user: {
                    name: 'Test',
                    isActive: 'true',
                    permissions: 'read,write,delete'
                }
            };

            const result = transformFormData(formData);

            expect(result).toEqual({
                user: {
                    name: 'Test',
                    isActive: true,
                    permissions: 'read,write,delete' // Won't be split unless it ends with Ids/List
                }
            });
        });

        it('should handle mixed data types', () => {
            const formData = {
                name: 'Test',
                age: '30',
                isActive: 'true',
                tags: 'tag1,tag2,tag3', // No Ids/List suffix, treated as string
                sessionIds: 'sess1,sess2', // Has Ids suffix, treated as array
                metadata: '{"key":"value"}'
            };

            const result = transformFormData(formData);

            expect(result).toEqual({
                name: 'Test',
                age: '30',
                isActive: true,
                tags: 'tag1,tag2,tag3',
                sessionIds: ['sess1', 'sess2'],
                metadata: { key: 'value' }
            });
        });

        it('should trim whitespace from array values', () => {
            const formData = {
                apiKeyIds: ' abc123 , def456 , ghi789 '
            };

            const result = transformFormData(formData);

            expect(result).toEqual({
                apiKeyIds: ['abc123', 'def456', 'ghi789']
            });
        });

        it('should filter empty values from arrays', () => {
            const formData = {
                sessionIds: 'sess1,,sess2,,,sess3'
            };

            const result = transformFormData(formData);

            expect(result).toEqual({
                sessionIds: ['sess1', 'sess2', 'sess3']
            });
        });

        it('should convert single value to array for Ids fields (no comma)', () => {
            const formData = {
                sessionIds: '01K8YS3V7KH1E0JKEJNZCKMGPX'
            };

            const result = transformFormData(formData);

            expect(result).toEqual({
                sessionIds: ['01K8YS3V7KH1E0JKEJNZCKMGPX']
            });
        });

        it('should convert single value to array for List fields (no comma)', () => {
            const formData = {
                userList: 'user123'
            };

            const result = transformFormData(formData);

            expect(result).toEqual({
                userList: ['user123']
            });
        });

        it('should convert single value to array for Keys fields (no comma)', () => {
            const formData = {
                apiKeys: 'sk_test_123'
            };

            const result = transformFormData(formData);

            expect(result).toEqual({
                apiKeys: ['sk_test_123']
            });
        });

        it('should handle empty string for array fields', () => {
            const formData = {
                sessionIds: ''
            };

            const result = transformFormData(formData);

            expect(result).toEqual({
                sessionIds: []
            });
        });

        it('should handle invalid JSON gracefully', () => {
            const formData = {
                data: '{invalid json}'
            };

            const result = transformFormData(formData);

            expect(result).toEqual({
                data: '{invalid json}'
            });
        });

        it('should skip undefined values', () => {
            const formData = {
                name: 'Test',
                description: undefined,
                age: '30'
            };

            const result = transformFormData(formData);

            expect(result).toEqual({
                name: 'Test',
                age: '30'
            });
        });

        it('should handle null values', () => {
            const formData = {
                name: 'Test',
                description: null,
                age: '30'
            };

            const result = transformFormData(formData);

            expect(result).toEqual({
                name: 'Test',
                description: null,
                age: '30'
            });
        });
    });

    describe('isArrayField', () => {
        it('should return true for fields ending with Ids', () => {
            expect(isArrayField('apiKeyIds')).toBe(true);
            expect(isArrayField('sessionIds')).toBe(true);
            expect(isArrayField('userIds')).toBe(true);
        });

        it('should return true for fields ending with []', () => {
            expect(isArrayField('items[]')).toBe(true);
            expect(isArrayField('tags[]')).toBe(true);
        });

        it('should return true for fields ending with List', () => {
            expect(isArrayField('userList')).toBe(true);
            expect(isArrayField('permissionList')).toBe(true);
        });

        it('should return true for fields ending with Keys', () => {
            expect(isArrayField('apiKeys')).toBe(true);
            expect(isArrayField('accessKeys')).toBe(true);
        });

        it('should return false for regular fields', () => {
            expect(isArrayField('name')).toBe(false);
            expect(isArrayField('email')).toBe(false);
            expect(isArrayField('description')).toBe(false);
        });
    });

    describe('parseCommaSeparated', () => {
        it('should parse comma-separated values', () => {
            const result = parseCommaSeparated('1,2,3,4,5');

            expect(result).toEqual(['1', '2', '3', '4', '5']);
        });

        it('should trim whitespace', () => {
            const result = parseCommaSeparated(' a , b , c ');

            expect(result).toEqual(['a', 'b', 'c']);
        });

        it('should filter empty values', () => {
            const result = parseCommaSeparated('a,,b,,,c');

            expect(result).toEqual(['a', 'b', 'c']);
        });

        it('should handle single value', () => {
            const result = parseCommaSeparated('single');

            expect(result).toEqual(['single']);
        });

        it('should handle empty string', () => {
            const result = parseCommaSeparated('');

            expect(result).toEqual([]);
        });
    });
});
