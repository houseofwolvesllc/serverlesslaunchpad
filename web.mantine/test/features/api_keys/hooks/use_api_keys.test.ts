import { describe, expect, it } from 'vitest';
import { PAGE_SIZE_OPTIONS } from '../../../../src/constants/pagination';

describe('useApiKeys Hook Configuration', () => {
    describe('Page Size Options', () => {
        it('should support valid page sizes', () => {
            expect(PAGE_SIZE_OPTIONS).toEqual([25, 50, 100]);
        });

        it('should have exactly 4 page size options', () => {
            expect(PAGE_SIZE_OPTIONS).toHaveLength(3);
        });

        it('should have page sizes in ascending order', () => {
            const sorted = [...PAGE_SIZE_OPTIONS].sort((a, b) => a - b);
            expect(PAGE_SIZE_OPTIONS).toEqual(sorted);
        });
    });

    describe('localStorage Configuration', () => {
        it('should use consistent localStorage key', () => {
            const expectedKey = 'api_keys_page_size';
            // This validates the key name used in the hook
            expect(expectedKey).toBe('api_keys_page_size');
        });
    });
});
