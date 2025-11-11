/**
 * Tests for Collection Module
 */

import { describe, it, expect } from 'vitest';
import {
    extractCollection,
    isCollection,
    getCollectionKey,
} from '../../src/collection/collection';
import type { HalObject } from '@houseofwolves/serverlesslaunchpad.types/hal';

describe('Collection Module', () => {
    describe('extractCollection', () => {
        it('should extract complete collection data', () => {
            const resource: HalObject = {
                _embedded: {
                    items: [
                        {
                            id: '1',
                            name: 'Item 1',
                            status: 'active',
                            createdAt: '2024-01-01T00:00:00Z',
                        },
                        {
                            id: '2',
                            name: 'Item 2',
                            status: 'inactive',
                            createdAt: '2024-01-02T00:00:00Z',
                        },
                    ],
                },
            };

            const collection = extractCollection(resource);

            expect(collection.items).toHaveLength(2);
            expect(collection.columns.length).toBeGreaterThan(0);
            expect(collection.items[0].id).toBe('1');
        });

        it('should infer columns automatically', () => {
            const resource: HalObject = {
                _embedded: {
                    items: [
                        {
                            name: 'Test',
                            createdAt: '2024-01-01T00:00:00Z',
                            count: 42,
                        },
                    ],
                },
            };

            const collection = extractCollection(resource);
            const columnKeys = collection.columns.map(c => c.key);

            expect(columnKeys).toContain('name');
            expect(columnKeys).toContain('createdAt');
            expect(columnKeys).toContain('count');
        });

        it('should extract pagination info', () => {
            const resource: HalObject = {
                _embedded: {
                    items: [{ id: '1' }],
                },
                page: {
                    number: 0,
                    size: 10,
                    totalElements: 100,
                },
            };

            const collection = extractCollection(resource);

            expect(collection.page).toBeDefined();
            expect(collection.page?.number).toBe(0);
            expect(collection.page?.size).toBe(10);
            expect(collection.total).toBe(100);
        });

        it('should handle custom embedded key', () => {
            const resource: HalObject = {
                _embedded: {
                    sessions: [
                        { id: '1', deviceName: 'Device 1' },
                        { id: '2', deviceName: 'Device 2' },
                    ],
                },
            };

            const collection = extractCollection(resource, {
                embeddedKey: 'sessions',
            });

            expect(collection.items).toHaveLength(2);
            expect(collection.items[0].deviceName).toBe('Device 1');
        });

        it('should respect includeHidden option', () => {
            const resource: HalObject = {
                _embedded: {
                    items: [
                        {
                            id: '1',
                            name: 'Test',
                            password: 'secret',
                        },
                    ],
                },
            };

            const withoutHidden = extractCollection(resource, {
                includeHidden: false,
            });
            const withHidden = extractCollection(resource, {
                includeHidden: true,
            });

            expect(withHidden.columns.length).toBeGreaterThan(withoutHidden.columns.length);
        });

        it('should apply inference options', () => {
            const resource: HalObject = {
                _embedded: {
                    items: [
                        {
                            id: '1',
                            customField: 'value',
                        },
                    ],
                },
            };

            const collection = extractCollection(resource, {
                labelOverrides: {
                    'customField': 'My Custom Label',
                },
            });

            const customColumn = collection.columns.find(c => c.key === 'customField');
            expect(customColumn?.label).toBe('My Custom Label');
        });
    });

    describe('isCollection', () => {
        it('should return true for resources with embedded arrays', () => {
            const resource: HalObject = {
                _embedded: {
                    items: [{ id: '1' }, { id: '2' }],
                },
            };

            expect(isCollection(resource)).toBe(true);
        });

        it('should return false for resources without _embedded', () => {
            const resource: HalObject = {
                id: '1',
                name: 'Single Resource',
            };

            expect(isCollection(resource)).toBe(false);
        });

        it('should return false for resources with _embedded but no arrays', () => {
            const resource: HalObject = {
                _embedded: {
                    related: { id: '1' },
                },
            };

            expect(isCollection(resource)).toBe(false);
        });
    });

    describe('getCollectionKey', () => {
        it('should find common collection keys', () => {
            const testCases = [
                { key: 'items', data: [{ id: '1' }] },
                { key: 'results', data: [{ id: '1' }] },
                { key: 'data', data: [{ id: '1' }] },
                { key: 'records', data: [{ id: '1' }] },
            ];

            for (const testCase of testCases) {
                const resource: HalObject = {
                    _embedded: {
                        [testCase.key]: testCase.data,
                    },
                };

                expect(getCollectionKey(resource)).toBe(testCase.key);
            }
        });

        it('should find custom collection keys', () => {
            const resource: HalObject = {
                _embedded: {
                    sessions: [{ id: '1' }],
                },
            };

            expect(getCollectionKey(resource)).toBe('sessions');
        });

        it('should return undefined for non-collection resources', () => {
            const resource: HalObject = {
                id: '1',
                name: 'Single Resource',
            };

            expect(getCollectionKey(resource)).toBeUndefined();
        });

        it('should prefer common keys over custom keys', () => {
            const resource: HalObject = {
                _embedded: {
                    items: [{ id: '1' }],
                    customKey: [{ id: '2' }],
                },
            };

            // Should return 'items' because it's a common key
            expect(getCollectionKey(resource)).toBe('items');
        });
    });
});
