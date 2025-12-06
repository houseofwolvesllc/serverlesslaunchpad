/**
 * Tests for Collection Inference
 */

import { describe, it, expect } from 'vitest';
import { FieldType } from '../../src/collection/types';
import {
    inferFieldType,
    inferColumns,
    inferVisibleColumns,
    isSortable,
} from '../../src/collection/inference';
import {
    humanizeLabel,
    extractEmbeddedItems,
    getUniqueKeys,
    isDateValue,
    isUrlValue,
    isEmailValue,
} from '../../src/collection/utils';

describe('Collection Inference', () => {
    describe('humanizeLabel', () => {
        it('should convert camelCase to human readable', () => {
            expect(humanizeLabel('createdAt')).toBe('Created At');
            expect(humanizeLabel('userName')).toBe('User Name');
            expect(humanizeLabel('isActive')).toBe('Is Active');
        });

        it('should convert snake_case to human readable', () => {
            expect(humanizeLabel('user_name')).toBe('User Name');
            expect(humanizeLabel('created_at')).toBe('Created At');
            expect(humanizeLabel('api_key')).toBe('API Key');
        });

        it('should handle acronyms correctly', () => {
            expect(humanizeLabel('apiKey')).toBe('API Key');
            expect(humanizeLabel('userId')).toBe('User ID');
            expect(humanizeLabel('httpUrl')).toBe('HTTP URL');
        });

        it('should handle numbers', () => {
            expect(humanizeLabel('version2')).toBe('Version 2');
            expect(humanizeLabel('test123')).toBe('Test 123');
        });
    });

    describe('inferFieldType', () => {
        it('should infer DATE type from field names', () => {
            expect(inferFieldType('createdAt', [])).toBe(FieldType.DATE);
            expect(inferFieldType('updated_at', [])).toBe(FieldType.DATE);
            expect(inferFieldType('dateCreated', [])).toBe(FieldType.DATE);
            expect(inferFieldType('expiresOn', [])).toBe(FieldType.DATE);
        });

        it('should infer CODE type from field names', () => {
            expect(inferFieldType('id', [])).toBe(FieldType.CODE);
            expect(inferFieldType('userId', [])).toBe(FieldType.CODE);
            expect(inferFieldType('apiKey', [])).toBe(FieldType.CODE);
            expect(inferFieldType('token', [])).toBe(FieldType.CODE);
        });

        it('should infer BADGE type from field names', () => {
            expect(inferFieldType('status', [])).toBe(FieldType.BADGE);
            expect(inferFieldType('state', [])).toBe(FieldType.BADGE);
            expect(inferFieldType('type', [])).toBe(FieldType.BADGE);
            expect(inferFieldType('role', [])).toBe(FieldType.BADGE);
        });

        it('should infer BOOLEAN type from field names', () => {
            expect(inferFieldType('isActive', [])).toBe(FieldType.BOOLEAN);
            expect(inferFieldType('hasAccess', [])).toBe(FieldType.BOOLEAN);
            expect(inferFieldType('canEdit', [])).toBe(FieldType.BOOLEAN);
            expect(inferFieldType('enabled', [])).toBe(FieldType.BOOLEAN);
        });

        it('should infer URL type from field names', () => {
            expect(inferFieldType('url', [])).toBe(FieldType.URL);
            expect(inferFieldType('website', [])).toBe(FieldType.URL);
            expect(inferFieldType('homepage', [])).toBe(FieldType.URL);
        });

        it('should infer EMAIL type from field names', () => {
            expect(inferFieldType('email', [])).toBe(FieldType.EMAIL);
            expect(inferFieldType('contactEmail', [])).toBe(FieldType.EMAIL);
        });

        it('should infer HIDDEN type from field names', () => {
            expect(inferFieldType('password', [])).toBe(FieldType.HIDDEN);
            expect(inferFieldType('secret', [])).toBe(FieldType.HIDDEN);
            expect(inferFieldType('_metadata', [])).toBe(FieldType.HIDDEN);
        });

        it('should infer type from values when name is ambiguous', () => {
            expect(inferFieldType('value', [true, false])).toBe(FieldType.BOOLEAN);
            expect(inferFieldType('count', [1, 2, 3])).toBe(FieldType.NUMBER);
            expect(inferFieldType('when', ['2024-01-01T00:00:00Z'])).toBe(FieldType.DATE);
            expect(inferFieldType('site', ['https://example.com'])).toBe(FieldType.URL);
            expect(inferFieldType('contact', ['user@example.com'])).toBe(FieldType.EMAIL);
        });

        it('should respect field type overrides', () => {
            const options = {
                fieldTypeOverrides: {
                    'customField': FieldType.BADGE,
                },
            };
            expect(inferFieldType('customField', [], options)).toBe(FieldType.BADGE);
        });
    });

    describe('inferColumns', () => {
        const sampleData = [
            {
                id: '123',
                name: 'Test Item',
                status: 'active',
                createdAt: '2024-01-01T00:00:00Z',
                count: 42,
                isActive: true,
                email: 'test@example.com',
            },
            {
                id: '456',
                name: 'Another Item',
                status: 'inactive',
                createdAt: '2024-01-02T00:00:00Z',
                count: 24,
                isActive: false,
                email: 'another@example.com',
            },
        ];

        it('should infer columns from data', () => {
            const columns = inferColumns(sampleData);

            expect(columns.length).toBeGreaterThan(0);
            expect(columns.every(col => col.key && col.label && col.type)).toBe(true);
        });

        it('should detect correct field types', () => {
            const columns = inferColumns(sampleData);
            const columnMap = Object.fromEntries(columns.map(c => [c.key, c]));

            expect(columnMap['id'].type).toBe(FieldType.CODE);
            expect(columnMap['name'].type).toBe(FieldType.TEXT);
            expect(columnMap['status'].type).toBe(FieldType.BADGE);
            expect(columnMap['createdAt'].type).toBe(FieldType.DATE);
            expect(columnMap['count'].type).toBe(FieldType.NUMBER);
            expect(columnMap['isActive'].type).toBe(FieldType.BOOLEAN);
            expect(columnMap['email'].type).toBe(FieldType.EMAIL);
        });

        it('should generate human-readable labels', () => {
            const columns = inferColumns(sampleData);
            const columnMap = Object.fromEntries(columns.map(c => [c.key, c]));

            expect(columnMap['createdAt'].label).toBe('Created At');
            expect(columnMap['isActive'].label).toBe('Is Active');
        });

        it('should preserve API order (index-based priority)', () => {
            const columns = inferColumns(sampleData);

            // Columns should be in API order with index-based priority
            // First column has priority 0, subsequent columns have increasing priority
            expect(columns[0].priority).toBe(0);
            expect(columns[1].priority).toBe(1);

            // Last column should have highest priority (last index)
            const lastColumn = columns[columns.length - 1];
            expect(lastColumn.priority).toBe(columns.length - 1);
        });

        it('should respect custom options', () => {
            const options = {
                hideFields: ['count'],
                labelOverrides: {
                    'id': 'Identifier',
                },
            };

            const columns = inferColumns(sampleData, options);
            const columnMap = Object.fromEntries(columns.map(c => [c.key, c]));

            expect(columnMap['count'].hidden).toBe(true);
            expect(columnMap['id'].label).toBe('Identifier');
        });
    });

    describe('inferVisibleColumns', () => {
        it('should filter out hidden columns', () => {
            const sampleData = [
                {
                    id: '123',
                    name: 'Test',
                    password: 'secret',
                    _metadata: 'internal',
                },
            ];

            const columns = inferVisibleColumns(sampleData);

            // Should not include 'id', 'password', or '_metadata'
            const keys = columns.map(c => c.key);
            expect(keys).not.toContain('password');
            expect(keys).not.toContain('_metadata');
        });
    });

    describe('extractEmbeddedItems', () => {
        it('should extract items from _embedded.items', () => {
            const resource = {
                _embedded: {
                    items: [{ id: '1' }, { id: '2' }],
                },
            };

            const items = extractEmbeddedItems(resource);
            expect(items).toHaveLength(2);
            expect(items[0].id).toBe('1');
        });

        it('should extract items from specific key', () => {
            const resource = {
                _embedded: {
                    sessions: [{ id: '1' }, { id: '2' }],
                },
            };

            const items = extractEmbeddedItems(resource, 'sessions');
            expect(items).toHaveLength(2);
        });

        it('should return empty array when no embedded data', () => {
            const resource = {};
            const items = extractEmbeddedItems(resource);
            expect(items).toEqual([]);
        });

        it('should auto-detect first array in _embedded', () => {
            const resource = {
                _embedded: {
                    customKey: [{ id: '1' }, { id: '2' }],
                },
            };

            const items = extractEmbeddedItems(resource);
            expect(items).toHaveLength(2);
        });
    });

    describe('utility functions', () => {
        describe('isDateValue', () => {
            it('should recognize ISO 8601 dates', () => {
                expect(isDateValue('2024-01-01T00:00:00Z')).toBe(true);
                expect(isDateValue('2024-01-01')).toBe(true);
            });

            it('should reject invalid dates', () => {
                expect(isDateValue('not a date')).toBe(false);
                expect(isDateValue(123)).toBe(false);
            });
        });

        describe('isUrlValue', () => {
            it('should recognize valid URLs', () => {
                expect(isUrlValue('https://example.com')).toBe(true);
                expect(isUrlValue('http://localhost:3000')).toBe(true);
            });

            it('should reject invalid URLs', () => {
                expect(isUrlValue('not a url')).toBe(false);
                expect(isUrlValue('example.com')).toBe(false);
            });
        });

        describe('isEmailValue', () => {
            it('should recognize valid emails', () => {
                expect(isEmailValue('user@example.com')).toBe(true);
                expect(isEmailValue('test.user@domain.co.uk')).toBe(true);
            });

            it('should reject invalid emails', () => {
                expect(isEmailValue('not an email')).toBe(false);
                expect(isEmailValue('user@')).toBe(false);
            });
        });

        describe('getUniqueKeys', () => {
            it('should extract all unique keys', () => {
                const items = [
                    { a: 1, b: 2 },
                    { b: 3, c: 4 },
                    { a: 5, d: 6 },
                ];

                const keys = getUniqueKeys(items);
                expect(keys).toContain('a');
                expect(keys).toContain('b');
                expect(keys).toContain('c');
                expect(keys).toContain('d');
            });

            it('should exclude metadata by default', () => {
                const items = [
                    { id: '1', _links: {}, _metadata: {} },
                ];

                const keys = getUniqueKeys(items);
                expect(keys).toContain('id');
                expect(keys).not.toContain('_links');
                expect(keys).not.toContain('_metadata');
            });
        });
    });

    describe('isSortable', () => {
        it('should return true for most field types', () => {
            expect(isSortable(FieldType.TEXT)).toBe(true);
            expect(isSortable(FieldType.NUMBER)).toBe(true);
            expect(isSortable(FieldType.DATE)).toBe(true);
        });

        it('should return false for hidden fields', () => {
            expect(isSortable(FieldType.HIDDEN)).toBe(false);
        });
    });

    // Note: getFieldPriority was removed - columns now use index-based priority
    // preserving API order instead of sorting by field type
});
