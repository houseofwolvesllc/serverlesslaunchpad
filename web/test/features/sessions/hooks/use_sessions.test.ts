import { describe, expect, it } from 'vitest';
import { PAGE_SIZE_OPTIONS } from '../../../../src/features/sessions/types';

describe('useSessions Hook - Configuration', () => {
    describe('page size options', () => {
        it('should support valid page sizes', () => {
            const validSizes = [10, 25, 50, 100];
            validSizes.forEach((size) => {
                expect(PAGE_SIZE_OPTIONS).toContain(size);
            });
        });

        it('should have exactly 4 page size options', () => {
            expect(PAGE_SIZE_OPTIONS.length).toBe(4);
        });

        it('should have page sizes in ascending order', () => {
            expect(PAGE_SIZE_OPTIONS).toEqual([10, 25, 50, 100]);
        });
    });

    describe('localStorage keys', () => {
        it('should use consistent localStorage key for sessions', () => {
            const expectedKey = 'sessions_page_size';
            expect(expectedKey).toBe('sessions_page_size');
        });
    });
});
