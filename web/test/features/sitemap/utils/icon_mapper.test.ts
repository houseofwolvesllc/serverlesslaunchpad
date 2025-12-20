/**
 * Tests for Icon Mapper Utility
 */

import { describe, it, expect } from 'vitest';
import { getIcon, hasIcon, getAvailableIconNames, iconMapper } from '../../../../src/features/sitemap/utils/icon_mapper';
import { IconLock, IconUsers, IconCircle } from '@tabler/icons-react';

describe('Icon Mapper', () => {
    describe('getIcon', () => {
        it('should return correct icon for known icon names', () => {
            expect(getIcon('lock')).toBe(IconLock);
            expect(getIcon('users')).toBe(IconUsers);
        });

        it('should return default icon for unknown icon names', () => {
            expect(getIcon('unknown-icon')).toBe(IconCircle);
            expect(getIcon('nonexistent')).toBe(IconCircle);
        });

        it('should return default icon for undefined', () => {
            expect(getIcon(undefined)).toBe(IconCircle);
        });

        it('should return default icon for empty string', () => {
            expect(getIcon('')).toBe(IconCircle);
        });

        it('should handle case-insensitive icon names', () => {
            expect(getIcon('LOCK')).toBe(IconLock);
            expect(getIcon('UsErS')).toBe(IconUsers);
        });

        it('should handle icon names with whitespace', () => {
            expect(getIcon('  lock  ')).toBe(IconLock);
        });
    });

    describe('hasIcon', () => {
        it('should return true for known icon names', () => {
            expect(hasIcon('lock')).toBe(true);
            expect(hasIcon('users')).toBe(true);
            expect(hasIcon('shield')).toBe(true);
        });

        it('should return false for unknown icon names', () => {
            expect(hasIcon('unknown')).toBe(false);
            expect(hasIcon('nonexistent')).toBe(false);
        });

        it('should return false for undefined', () => {
            expect(hasIcon(undefined)).toBe(false);
        });

        it('should return false for empty string', () => {
            expect(hasIcon('')).toBe(false);
        });

        it('should return false for default icon name', () => {
            expect(hasIcon('default')).toBe(false);
        });

        it('should handle case-insensitive icon names', () => {
            expect(hasIcon('LOCK')).toBe(true);
            expect(hasIcon('UsErS')).toBe(true);
        });
    });

    describe('getAvailableIconNames', () => {
        it('should return array of available icon names', () => {
            const names = getAvailableIconNames();
            expect(Array.isArray(names)).toBe(true);
            expect(names.length).toBeGreaterThan(0);
        });

        it('should not include default in available names', () => {
            const names = getAvailableIconNames();
            expect(names).not.toContain('default');
        });

        it('should include common icon names', () => {
            const names = getAvailableIconNames();
            expect(names).toContain('lock');
            expect(names).toContain('users');
            expect(names).toContain('shield');
            expect(names).toContain('home');
        });
    });

    describe('iconMapper', () => {
        it('should have default icon', () => {
            expect(iconMapper.default).toBe(IconCircle);
        });

        it('should have security icons', () => {
            expect(iconMapper.lock).toBeDefined();
            expect(iconMapper.shield).toBeDefined();
            expect(iconMapper.key).toBeDefined();
        });

        it('should have user management icons', () => {
            expect(iconMapper.users).toBeDefined();
            expect(iconMapper.user).toBeDefined();
        });

        it('should have navigation icons', () => {
            expect(iconMapper.home).toBeDefined();
            expect(iconMapper.dashboard).toBeDefined();
            expect(iconMapper.gauge).toBeDefined();
        });
    });
});
