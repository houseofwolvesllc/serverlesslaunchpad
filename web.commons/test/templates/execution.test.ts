/**
 * Tests for Template Execution Context
 */

import { describe, it, expect } from 'vitest';
import {
    getPropertySource,
    buildTemplateData,
    type TemplateExecutionContext,
} from '../../src/templates/execution';
import type { HalTemplate, HalTemplateProperty } from '@houseofwolves/serverlesslaunchpad.types/hal';

describe('Template Execution', () => {
    describe('getPropertySource', () => {
        describe('Value source', () => {
            it('should detect value source for hidden field with value', () => {
                const property: HalTemplateProperty = {
                    name: 'cursor',
                    type: 'hidden',
                    value: 'abc123',
                };

                const source = getPropertySource(property);
                expect(source).toBe('value');
            });

            it('should detect form source for non-hidden field with explicit value', () => {
                // Non-hidden fields with values should use form source
                // so user edits take precedence over pre-filled values
                const property: HalTemplateProperty = {
                    name: 'userId',
                    type: 'text',
                    value: 'user123',
                };

                const source = getPropertySource(property);
                expect(source).toBe('form');
            });

            it('should detect form source for checkbox with value false', () => {
                // Checkbox fields should use form source even with pre-filled values
                const property: HalTemplateProperty = {
                    name: 'enabled',
                    type: 'checkbox',
                    value: false,
                };

                const source = getPropertySource(property);
                expect(source).toBe('form');
            });
        });

        describe('Selection source', () => {
            it('should detect selection source for array type', () => {
                const property: HalTemplateProperty = {
                    name: 'items',
                    type: 'array',
                    required: true,
                };

                const source = getPropertySource(property);
                expect(source).toBe('selection');
            });

            it('should detect selection source for property ending with Ids', () => {
                const property: HalTemplateProperty = {
                    name: 'sessionIds',
                    type: 'text',
                    required: true,
                };

                const source = getPropertySource(property);
                expect(source).toBe('selection');
            });

            it('should detect selection source for userIds property', () => {
                const property: HalTemplateProperty = {
                    name: 'userIds',
                    type: 'text',
                };

                const source = getPropertySource(property);
                expect(source).toBe('selection');
            });
        });

        describe('Form source', () => {
            it('should detect form source for text input', () => {
                const property: HalTemplateProperty = {
                    name: 'label',
                    type: 'text',
                    required: true,
                };

                const source = getPropertySource(property);
                expect(source).toBe('form');
            });

            it('should detect form source for textarea', () => {
                const property: HalTemplateProperty = {
                    name: 'description',
                    type: 'textarea',
                };

                const source = getPropertySource(property);
                expect(source).toBe('form');
            });

            it('should detect form source for select', () => {
                const property: HalTemplateProperty = {
                    name: 'status',
                    type: 'select',
                    required: true,
                };

                const source = getPropertySource(property);
                expect(source).toBe('form');
            });

            it('should detect form source for number input', () => {
                const property: HalTemplateProperty = {
                    name: 'count',
                    type: 'number',
                };

                const source = getPropertySource(property);
                expect(source).toBe('form');
            });
        });
    });

    describe('buildTemplateData', () => {
        describe('Value properties', () => {
            it('should use explicit values from template properties', () => {
                const template: HalTemplate = {
                    method: 'GET',
                    properties: [
                        { name: 'cursor', type: 'hidden', value: 'abc123' },
                        { name: 'limit', type: 'hidden', value: 20 },
                    ],
                };

                const context: TemplateExecutionContext = { template };
                const data = buildTemplateData(context);

                expect(data).toEqual({
                    cursor: 'abc123',
                    limit: 20,
                });
            });

            it('should handle boolean false values', () => {
                const template: HalTemplate = {
                    method: 'POST',
                    properties: [
                        { name: 'enabled', type: 'hidden', value: false },
                    ],
                };

                const context: TemplateExecutionContext = { template };
                const data = buildTemplateData(context);

                expect(data).toEqual({ enabled: false });
            });
        });

        describe('Selection properties', () => {
            it('should use selections for array properties', () => {
                const template: HalTemplate = {
                    method: 'DELETE',
                    properties: [
                        { name: 'sessionIds', type: 'array', required: true },
                    ],
                };

                const context: TemplateExecutionContext = {
                    template,
                    selections: ['id1', 'id2', 'id3'],
                };
                const data = buildTemplateData(context);

                expect(data).toEqual({
                    sessionIds: ['id1', 'id2', 'id3'],
                });
            });

            it('should use selections for properties ending with Ids', () => {
                const template: HalTemplate = {
                    method: 'DELETE',
                    properties: [
                        { name: 'userIds', type: 'text', required: true },
                    ],
                };

                const context: TemplateExecutionContext = {
                    template,
                    selections: ['user1', 'user2'],
                };
                const data = buildTemplateData(context);

                expect(data).toEqual({
                    userIds: ['user1', 'user2'],
                });
            });

            it('should throw error for required selection property with no selections', () => {
                const template: HalTemplate = {
                    method: 'DELETE',
                    properties: [
                        { name: 'sessionIds', type: 'array', required: true },
                    ],
                };

                const context: TemplateExecutionContext = {
                    template,
                    selections: [],
                };

                expect(() => buildTemplateData(context)).toThrow(
                    'At least one item must be selected for sessionIds'
                );
            });

            it('should skip optional selection property with no selections', () => {
                const template: HalTemplate = {
                    method: 'POST',
                    properties: [
                        { name: 'itemIds', type: 'array', required: false },
                    ],
                };

                const context: TemplateExecutionContext = {
                    template,
                    selections: [],
                };
                const data = buildTemplateData(context);

                expect(data).toEqual({});
            });
        });

        describe('Form properties', () => {
            it('should use form data for form properties', () => {
                const template: HalTemplate = {
                    method: 'POST',
                    properties: [
                        { name: 'label', type: 'text', required: true },
                        { name: 'description', type: 'textarea' },
                    ],
                };

                const context: TemplateExecutionContext = {
                    template,
                    formData: {
                        label: 'My Label',
                        description: 'My Description',
                    },
                };
                const data = buildTemplateData(context);

                expect(data).toEqual({
                    label: 'My Label',
                    description: 'My Description',
                });
            });

            it('should fall back to resource data if form data missing', () => {
                const template: HalTemplate = {
                    method: 'PUT',
                    properties: [
                        { name: 'label', type: 'text', required: true },
                        { name: 'status', type: 'select' },
                    ],
                };

                const context: TemplateExecutionContext = {
                    template,
                    resource: {
                        label: 'Resource Label',
                        status: 'active',
                    },
                };
                const data = buildTemplateData(context);

                expect(data).toEqual({
                    label: 'Resource Label',
                    status: 'active',
                });
            });

            it('should prefer form data over resource data', () => {
                const template: HalTemplate = {
                    method: 'PUT',
                    properties: [
                        { name: 'label', type: 'text', required: true },
                    ],
                };

                const context: TemplateExecutionContext = {
                    template,
                    formData: { label: 'Form Label' },
                    resource: { label: 'Resource Label' },
                };
                const data = buildTemplateData(context);

                expect(data).toEqual({ label: 'Form Label' });
            });

            it('should throw error for required field with no data', () => {
                const template: HalTemplate = {
                    method: 'POST',
                    properties: [
                        { name: 'label', type: 'text', required: true },
                    ],
                };

                const context: TemplateExecutionContext = { template };

                expect(() => buildTemplateData(context)).toThrow(
                    'Required field label is missing'
                );
            });

            it('should skip optional fields with no data', () => {
                const template: HalTemplate = {
                    method: 'POST',
                    properties: [
                        { name: 'description', type: 'textarea', required: false },
                    ],
                };

                const context: TemplateExecutionContext = { template };
                const data = buildTemplateData(context);

                expect(data).toEqual({});
            });
        });

        describe('Mixed properties', () => {
            it('should handle mix of value, selection, and form properties', () => {
                const template: HalTemplate = {
                    method: 'POST',
                    properties: [
                        { name: 'userId', type: 'hidden', value: 'user123' },
                        { name: 'sessionIds', type: 'array', required: true },
                        { name: 'reason', type: 'text', required: true },
                    ],
                };

                const context: TemplateExecutionContext = {
                    template,
                    selections: ['session1', 'session2'],
                    formData: { reason: 'Cleanup' },
                };
                const data = buildTemplateData(context);

                expect(data).toEqual({
                    userId: 'user123',
                    sessionIds: ['session1', 'session2'],
                    reason: 'Cleanup',
                });
            });

            it('should build data for navigation template', () => {
                const template: HalTemplate = {
                    method: 'GET',
                    properties: [
                        { name: 'cursor', type: 'hidden', value: 'next_page' },
                        { name: 'limit', type: 'hidden', value: 50 },
                    ],
                };

                const context: TemplateExecutionContext = { template };
                const data = buildTemplateData(context);

                expect(data).toEqual({
                    cursor: 'next_page',
                    limit: 50,
                });
            });
        });

        describe('Edge cases', () => {
            it('should handle template with no properties', () => {
                const template: HalTemplate = {
                    method: 'POST',
                };

                const context: TemplateExecutionContext = { template };
                const data = buildTemplateData(context);

                expect(data).toEqual({});
            });

            it('should handle template with empty properties array', () => {
                const template: HalTemplate = {
                    method: 'POST',
                    properties: [],
                };

                const context: TemplateExecutionContext = { template };
                const data = buildTemplateData(context);

                expect(data).toEqual({});
            });

            it('should handle null resource', () => {
                const template: HalTemplate = {
                    method: 'PUT',
                    properties: [
                        { name: 'status', type: 'select' },
                    ],
                };

                const context: TemplateExecutionContext = {
                    template,
                    resource: null,
                    formData: { status: 'active' },
                };
                const data = buildTemplateData(context);

                expect(data).toEqual({ status: 'active' });
            });

            it('should handle hidden property value of 0', () => {
                const template: HalTemplate = {
                    method: 'POST',
                    properties: [
                        { name: 'count', type: 'hidden', value: 0 },
                    ],
                };

                const context: TemplateExecutionContext = { template };
                const data = buildTemplateData(context);

                expect(data).toEqual({ count: 0 });
            });

            it('should handle hidden property value of empty string', () => {
                const template: HalTemplate = {
                    method: 'POST',
                    properties: [
                        { name: 'filter', type: 'hidden', value: '' },
                    ],
                };

                const context: TemplateExecutionContext = { template };
                const data = buildTemplateData(context);

                expect(data).toEqual({ filter: '' });
            });
        });
    });
});
