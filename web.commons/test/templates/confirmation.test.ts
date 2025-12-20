/**
 * Tests for Confirmation Config Generation
 */

import { describe, it, expect } from 'vitest';
import { getConfirmationConfig } from '../../src/templates/confirmation';
import type { TemplateExecutionContext } from '../../src/templates/execution';
import type { HalTemplate } from '@houseofwolves/serverlesslaunchpad.types/hal';

describe('Confirmation Config', () => {
    describe('getConfirmationConfig', () => {
        describe('DELETE operations', () => {
            it('should generate destructive config for single DELETE', () => {
                const template: HalTemplate = {
                    method: 'DELETE',
                    title: 'Delete Session',
                };

                const context: TemplateExecutionContext = { template };
                const config = getConfirmationConfig(template, context);

                expect(config.title).toBe('Delete Session');
                expect(config.message).toBe('Are you sure you want to delete this item? This action cannot be undone.');
                expect(config.confirmLabel).toBe('Delete');
                expect(config.cancelLabel).toBe('Cancel');
                expect(config.variant).toBe('destructive');
            });

            it('should generate config for bulk DELETE with count', () => {
                const template: HalTemplate = {
                    method: 'DELETE',
                    title: 'Delete Sessions',
                };

                const context: TemplateExecutionContext = {
                    template,
                    selections: ['id1', 'id2', 'id3'],
                };
                const config = getConfirmationConfig(template, context);

                expect(config.title).toBe('Delete Sessions');
                expect(config.message).toBe('Are you sure you want to delete 3 items? This action cannot be undone.');
                expect(config.confirmLabel).toBe('Delete');
                expect(config.variant).toBe('destructive');
            });

            it('should handle DELETE with single selection', () => {
                const template: HalTemplate = {
                    method: 'DELETE',
                    title: 'Delete API Key',
                };

                const context: TemplateExecutionContext = {
                    template,
                    selections: ['key1'],
                };
                const config = getConfirmationConfig(template, context);

                expect(config.message).toBe('Are you sure you want to delete 1 item? This action cannot be undone.');
            });

            it('should use default title for DELETE without title', () => {
                const template: HalTemplate = {
                    method: 'DELETE',
                };

                const context: TemplateExecutionContext = { template };
                const config = getConfirmationConfig(template, context);

                expect(config.title).toBe('Confirm Action');
                expect(config.variant).toBe('destructive');
            });
        });

        describe('Bulk operations (non-DELETE)', () => {
            it('should generate config for bulk archive operation', () => {
                const template: HalTemplate = {
                    method: 'POST',
                    title: 'Archive Sessions',
                };

                const context: TemplateExecutionContext = {
                    template,
                    selections: ['id1', 'id2'],
                };
                const config = getConfirmationConfig(template, context);

                expect(config.title).toBe('Archive Sessions');
                expect(config.message).toBe('Apply this action to 2 items?');
                expect(config.confirmLabel).toBe('Confirm');
                expect(config.variant).toBe('default');
            });

            it('should generate config for bulk operation with many items', () => {
                const template: HalTemplate = {
                    method: 'PUT',
                    title: 'Update Status',
                };

                const selections = Array.from({ length: 50 }, (_, i) => `id${i}`);
                const context: TemplateExecutionContext = {
                    template,
                    selections,
                };
                const config = getConfirmationConfig(template, context);

                expect(config.message).toBe('Apply this action to 50 items?');
                expect(config.variant).toBe('default');
            });
        });

        describe('Single item operations', () => {
            it('should generate config for archive operation', () => {
                const template: HalTemplate = {
                    method: 'POST',
                    title: 'Archive Session',
                };

                const context: TemplateExecutionContext = { template };
                const config = getConfirmationConfig(template, context);

                expect(config.title).toBe('Archive Session');
                expect(config.message).toBe('Are you sure you want to Archive Session?');
                expect(config.confirmLabel).toBe('Confirm');
                expect(config.variant).toBe('default');
            });

            it('should generate config for refresh operation', () => {
                const template: HalTemplate = {
                    method: 'GET',
                    title: 'Refresh Data',
                };

                const context: TemplateExecutionContext = { template };
                const config = getConfirmationConfig(template, context);

                expect(config.message).toBe('Are you sure you want to Refresh Data?');
                expect(config.variant).toBe('default');
            });

            it('should generate config for custom operation', () => {
                const template: HalTemplate = {
                    method: 'POST',
                    title: 'Reset Password',
                };

                const context: TemplateExecutionContext = { template };
                const config = getConfirmationConfig(template, context);

                expect(config.title).toBe('Reset Password');
                expect(config.message).toBe('Are you sure you want to Reset Password?');
                expect(config.confirmLabel).toBe('Confirm');
            });
        });

        describe('Singular vs plural messages', () => {
            it('should use singular "item" for single selection', () => {
                const template: HalTemplate = {
                    method: 'POST',
                    title: 'Archive',
                };

                const context: TemplateExecutionContext = {
                    template,
                    selections: ['id1'],
                };
                const config = getConfirmationConfig(template, context);

                expect(config.message).toContain('1 item');
                expect(config.message).not.toContain('1 items');
            });

            it('should use plural "items" for multiple selections', () => {
                const template: HalTemplate = {
                    method: 'POST',
                    title: 'Archive',
                };

                const context: TemplateExecutionContext = {
                    template,
                    selections: ['id1', 'id2'],
                };
                const config = getConfirmationConfig(template, context);

                expect(config.message).toContain('2 items');
            });

            it('should use plural "items" for zero selections', () => {
                const template: HalTemplate = {
                    method: 'POST',
                    title: 'Archive',
                };

                const context: TemplateExecutionContext = {
                    template,
                    selections: [],
                };
                const config = getConfirmationConfig(template, context);

                // With empty selections, it falls back to the default message
                expect(config.message).toBe('Are you sure you want to Archive?');
            });
        });

        describe('Variant detection', () => {
            it('should use destructive variant for DELETE method', () => {
                const template: HalTemplate = {
                    method: 'DELETE',
                    title: 'Remove',
                };

                const context: TemplateExecutionContext = { template };
                const config = getConfirmationConfig(template, context);

                expect(config.variant).toBe('destructive');
            });

            it('should use default variant for POST method', () => {
                const template: HalTemplate = {
                    method: 'POST',
                    title: 'Archive',
                };

                const context: TemplateExecutionContext = { template };
                const config = getConfirmationConfig(template, context);

                expect(config.variant).toBe('default');
            });

            it('should use default variant for PUT method', () => {
                const template: HalTemplate = {
                    method: 'PUT',
                    title: 'Update',
                };

                const context: TemplateExecutionContext = { template };
                const config = getConfirmationConfig(template, context);

                expect(config.variant).toBe('default');
            });

            it('should use default variant for GET method', () => {
                const template: HalTemplate = {
                    method: 'GET',
                    title: 'Refresh',
                };

                const context: TemplateExecutionContext = { template };
                const config = getConfirmationConfig(template, context);

                expect(config.variant).toBe('default');
            });
        });

        describe('Label defaults', () => {
            it('should always have Cancel as cancel label', () => {
                const template: HalTemplate = {
                    method: 'POST',
                    title: 'Test Action',
                };

                const context: TemplateExecutionContext = { template };
                const config = getConfirmationConfig(template, context);

                expect(config.cancelLabel).toBe('Cancel');
            });

            it('should use Confirm for non-DELETE operations', () => {
                const template: HalTemplate = {
                    method: 'POST',
                    title: 'Archive',
                };

                const context: TemplateExecutionContext = { template };
                const config = getConfirmationConfig(template, context);

                expect(config.confirmLabel).toBe('Confirm');
            });

            it('should use Delete for DELETE operations', () => {
                const template: HalTemplate = {
                    method: 'DELETE',
                    title: 'Remove Session',
                };

                const context: TemplateExecutionContext = { template };
                const config = getConfirmationConfig(template, context);

                expect(config.confirmLabel).toBe('Delete');
            });
        });

        describe('Edge cases', () => {
            it('should handle template without method', () => {
                const template: HalTemplate = {
                    title: 'Custom Action',
                };

                const context: TemplateExecutionContext = { template };
                const config = getConfirmationConfig(template, context);

                expect(config.title).toBe('Custom Action');
                expect(config.variant).toBe('default');
                expect(config.confirmLabel).toBe('Confirm');
            });

            it('should handle template without title', () => {
                const template: HalTemplate = {
                    method: 'POST',
                };

                const context: TemplateExecutionContext = { template };
                const config = getConfirmationConfig(template, context);

                expect(config.title).toBe('Confirm Action');
            });

            it('should handle empty selections array', () => {
                const template: HalTemplate = {
                    method: 'DELETE',
                    title: 'Delete Items',
                };

                const context: TemplateExecutionContext = {
                    template,
                    selections: [],
                };
                const config = getConfirmationConfig(template, context);

                // Falls back to single item message when no selections
                expect(config.message).toBe('Are you sure you want to delete this item? This action cannot be undone.');
            });

            it('should handle resource in context (ignored for confirmation)', () => {
                const template: HalTemplate = {
                    method: 'DELETE',
                    title: 'Delete Resource',
                };

                const context: TemplateExecutionContext = {
                    template,
                    resource: { id: '123', name: 'Test' },
                };
                const config = getConfirmationConfig(template, context);

                expect(config.message).toBe('Are you sure you want to delete this item? This action cannot be undone.');
            });
        });
    });
});
