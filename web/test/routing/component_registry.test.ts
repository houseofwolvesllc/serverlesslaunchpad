/**
 * Component Registry Tests
 *
 * Tests for the component registry that maps navigation IDs to React components.
 */

import { describe, it, expect } from 'vitest';
import { getComponentForId, hasComponent, componentRegistry } from '../../src/routing/component_registry';
import { SessionsList } from '../../src/features/sessions';
import { ApiKeysList } from '../../src/features/api_keys';
import { Admin } from '../../src/features/admin';

describe('componentRegistry', () => {
    describe('componentRegistry object', () => {
        it('should contain all registered components', () => {
            expect(componentRegistry).toBeDefined();
            expect(Object.keys(componentRegistry).length).toBeGreaterThan(0);
        });

        it('should map sessions to SessionsList', () => {
            expect(componentRegistry['sessions']).toBe(SessionsList);
        });

        it('should map api-keys to ApiKeysList', () => {
            expect(componentRegistry['api-keys']).toBe(ApiKeysList);
        });

        it('should map admin to Admin', () => {
            expect(componentRegistry['admin']).toBe(Admin);
        });
    });

    describe('getComponentForId', () => {
        it('should return component for known ID', () => {
            const Component = getComponentForId('sessions');
            expect(Component).toBe(SessionsList);
        });

        it('should return SessionsList for sessions ID', () => {
            const Component = getComponentForId('sessions');
            expect(Component).toBe(SessionsList);
        });

        it('should return ApiKeysList for api-keys ID', () => {
            const Component = getComponentForId('api-keys');
            expect(Component).toBe(ApiKeysList);
        });

        it('should return Admin for admin ID', () => {
            const Component = getComponentForId('admin');
            expect(Component).toBe(Admin);
        });

        it('should return null for unknown ID', () => {
            const Component = getComponentForId('unknown-component');
            expect(Component).toBeNull();
        });

        it('should return null for empty string', () => {
            const Component = getComponentForId('');
            expect(Component).toBeNull();
        });

        it('should return null for non-existent resource', () => {
            const Component = getComponentForId('webhooks');
            expect(Component).toBeNull();
        });
    });

    describe('hasComponent', () => {
        it('should return true for registered sessions component', () => {
            expect(hasComponent('sessions')).toBe(true);
        });

        it('should return true for registered api-keys component', () => {
            expect(hasComponent('api-keys')).toBe(true);
        });

        it('should return true for registered admin component', () => {
            expect(hasComponent('admin')).toBe(true);
        });

        it('should return false for unknown ID', () => {
            expect(hasComponent('unknown-component')).toBe(false);
        });

        it('should return false for empty string', () => {
            expect(hasComponent('')).toBe(false);
        });

        it('should return false for non-existent resource', () => {
            expect(hasComponent('webhooks')).toBe(false);
        });

        it('should return false for partial matches', () => {
            expect(hasComponent('session')).toBe(false); // Note: singular vs plural
            expect(hasComponent('api-key')).toBe(false); // Note: singular vs plural
        });
    });

    describe('edge cases', () => {
        it('should handle case-sensitive lookups', () => {
            // Registry keys are lowercase
            expect(hasComponent('Sessions')).toBe(false);
            expect(hasComponent('ADMIN')).toBe(false);
        });

        it('should not match substrings', () => {
            expect(hasComponent('sess')).toBe(false);
            expect(hasComponent('ions')).toBe(false);
        });
    });
});
