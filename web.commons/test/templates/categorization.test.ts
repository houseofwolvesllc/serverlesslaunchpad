/**
 * Tests for Template Categorization
 */

import { describe, it, expect } from 'vitest';
import { categorizeTemplate } from '../../src/templates/categorization';
import type { HalTemplate } from '@houseofwolves/serverlesslaunchpad.types/hal';

describe('Template Categorization', () => {
    describe('categorizeTemplate', () => {
        describe('Navigation templates (GET/POST with all hidden)', () => {
            it('should categorize GET with all hidden fields as navigation', () => {
                const template: HalTemplate = {
                    method: 'GET',
                    properties: [
                        { name: 'cursor', type: 'hidden', value: 'abc123' },
                        { name: 'limit', type: 'hidden', value: 20 },
                    ],
                };

                const category = categorizeTemplate('any-key', template);
                expect(category).toBe('navigation');
            });

            it('should categorize POST with all hidden fields as navigation', () => {
                const template: HalTemplate = {
                    method: 'POST',
                    target: '/users/123/sessions',
                    properties: [
                        { name: 'userId', type: 'hidden', value: '123' },
                    ],
                };

                const category = categorizeTemplate('sessions', template);
                expect(category).toBe('navigation');
            });

            it('should categorize GET with no properties as navigation', () => {
                const template: HalTemplate = {
                    method: 'GET',
                };

                const category = categorizeTemplate('refresh', template);
                expect(category).toBe('navigation');
            });

            it('should categorize POST with no properties as navigation', () => {
                const template: HalTemplate = {
                    method: 'POST',
                };

                const category = categorizeTemplate('api-keys', template);
                expect(category).toBe('navigation');
            });

            it('should categorize GET with empty properties array as navigation', () => {
                const template: HalTemplate = {
                    method: 'GET',
                    properties: [],
                };

                const category = categorizeTemplate('collection', template);
                expect(category).toBe('navigation');
            });

            it('should handle case-insensitive method (get)', () => {
                const template: HalTemplate = {
                    method: 'get',
                    properties: [{ name: 'id', type: 'hidden', value: '123' }],
                };

                const category = categorizeTemplate('self', template);
                expect(category).toBe('navigation');
            });

            it('should handle case-insensitive method (post)', () => {
                const template: HalTemplate = {
                    method: 'post',
                    properties: [],
                };

                const category = categorizeTemplate('list', template);
                expect(category).toBe('navigation');
            });
        });

        describe('Form templates (any template with visible fields)', () => {
            it('should categorize POST with visible fields as form', () => {
                const template: HalTemplate = {
                    method: 'POST',
                    properties: [
                        { name: 'label', type: 'text', required: true },
                        { name: 'description', type: 'textarea' },
                    ],
                };

                const category = categorizeTemplate('create', template);
                expect(category).toBe('form');
            });

            it('should categorize PUT with visible fields as form', () => {
                const template: HalTemplate = {
                    method: 'PUT',
                    properties: [
                        { name: 'label', type: 'text', required: true },
                        { name: 'status', type: 'select' },
                    ],
                };

                const category = categorizeTemplate('update', template);
                expect(category).toBe('form');
            });

            it('should categorize PATCH with visible fields as form', () => {
                const template: HalTemplate = {
                    method: 'PATCH',
                    properties: [
                        { name: 'name', type: 'text', required: true },
                    ],
                };

                const category = categorizeTemplate('edit', template);
                expect(category).toBe('form');
            });

            it('should categorize DELETE with visible fields as form', () => {
                const template: HalTemplate = {
                    method: 'DELETE',
                    properties: [
                        { name: 'reason', type: 'text', required: true },
                        { name: 'confirm', type: 'checkbox', required: true },
                    ],
                };

                const category = categorizeTemplate('delete', template);
                expect(category).toBe('form');
            });

            it('should categorize GET with visible fields as form', () => {
                const template: HalTemplate = {
                    method: 'GET',
                    properties: [
                        { name: 'query', type: 'text' },
                    ],
                };

                const category = categorizeTemplate('search', template);
                expect(category).toBe('form');
            });

            it('should categorize any key with visible fields as form', () => {
                const template: HalTemplate = {
                    method: 'POST',
                    properties: [
                        { name: 'option', type: 'select', required: true },
                    ],
                };

                const category = categorizeTemplate('custom-action', template);
                expect(category).toBe('form');
            });

            it('should categorize template with mixed hidden and visible as form', () => {
                const template: HalTemplate = {
                    method: 'POST',
                    properties: [
                        { name: 'userId', type: 'hidden', value: '123' },
                        { name: 'label', type: 'text', required: true },
                    ],
                };

                const category = categorizeTemplate('create', template);
                expect(category).toBe('form');
            });
        });

        describe('Action templates (PUT/DELETE/PATCH with all hidden)', () => {
            it('should categorize DELETE with all hidden as action', () => {
                const template: HalTemplate = {
                    method: 'DELETE',
                    properties: [
                        { name: 'id', type: 'hidden', value: '123' },
                    ],
                };

                const category = categorizeTemplate('delete', template);
                expect(category).toBe('action');
            });

            it('should categorize DELETE with no properties as action', () => {
                const template: HalTemplate = {
                    method: 'DELETE',
                };

                const category = categorizeTemplate('delete', template);
                expect(category).toBe('action');
            });

            it('should categorize bulk DELETE with all hidden as action', () => {
                const template: HalTemplate = {
                    method: 'DELETE',
                    properties: [
                        { name: 'ids', type: 'hidden', value: ['1', '2', '3'] },
                    ],
                };

                const category = categorizeTemplate('bulkDelete', template);
                expect(category).toBe('action');
            });

            it('should categorize PUT with all hidden as action', () => {
                const template: HalTemplate = {
                    method: 'PUT',
                    properties: [
                        { name: 'status', type: 'hidden', value: 'archived' },
                    ],
                };

                const category = categorizeTemplate('archive', template);
                expect(category).toBe('action');
            });

            it('should categorize PATCH with all hidden as action', () => {
                const template: HalTemplate = {
                    method: 'PATCH',
                    properties: [
                        { name: 'enabled', type: 'hidden', value: false },
                    ],
                };

                const category = categorizeTemplate('disable', template);
                expect(category).toBe('action');
            });

            it('should handle case-insensitive method (DELETE)', () => {
                const template: HalTemplate = {
                    method: 'delete',
                    properties: [],
                };

                const category = categorizeTemplate('remove', template);
                expect(category).toBe('action');
            });

            it('should handle case-insensitive method (PUT)', () => {
                const template: HalTemplate = {
                    method: 'put',
                    properties: [{ name: 'id', type: 'hidden', value: '123' }],
                };

                const category = categorizeTemplate('update', template);
                expect(category).toBe('action');
            });
        });

        describe('Edge cases', () => {
            it('should handle empty template key', () => {
                const template: HalTemplate = {
                    method: 'GET',
                };

                const category = categorizeTemplate('', template);
                expect(category).toBe('navigation'); // GET with all hidden → navigation
            });

            it('should handle template with no method (undefined)', () => {
                const template: HalTemplate = {
                    properties: [],
                };

                const category = categorizeTemplate('unknown', template);
                // With no method and all hidden, should fall to 'else' branch → action
                expect(category).toBe('action');
            });

            it('should handle template with mix of hidden and visible fields', () => {
                const template: HalTemplate = {
                    method: 'POST',
                    properties: [
                        { name: 'userId', type: 'hidden', value: '123' },
                        { name: 'confirm', type: 'checkbox', required: true },
                    ],
                };

                const category = categorizeTemplate('deactivate', template);
                expect(category).toBe('form'); // Has visible field → form
            });

            it('should handle POST with visible field (not navigation)', () => {
                const template: HalTemplate = {
                    method: 'POST',
                    properties: [
                        { name: 'query', type: 'text' },
                    ],
                };

                const category = categorizeTemplate('search', template);
                expect(category).toBe('form'); // Has visible field → form
            });

            it('should handle unusual method (HEAD/OPTIONS)', () => {
                const template: HalTemplate = {
                    method: 'HEAD',
                    properties: [],
                };

                const category = categorizeTemplate('check', template);
                // Not GET/POST, all hidden → action
                expect(category).toBe('action');
            });

            it('should handle mixed case method names', () => {
                const template: HalTemplate = {
                    method: 'Post',
                    properties: [{ name: 'id', type: 'hidden', value: '123' }],
                };

                const category = categorizeTemplate('submit', template);
                expect(category).toBe('navigation'); // POST (case-insensitive) → navigation
            });

            it('should handle null or undefined method gracefully', () => {
                const template: HalTemplate = {
                    method: undefined,
                    properties: [],
                };

                const category = categorizeTemplate('test', template);
                expect(category).toBe('action'); // No valid method → action
            });
        });
    });
});
