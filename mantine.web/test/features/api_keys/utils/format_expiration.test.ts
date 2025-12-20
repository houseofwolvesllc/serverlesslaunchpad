import { describe, expect, it } from 'vitest';
import { formatExpiration } from '../../../../src/features/api_keys/utils/format_expiration';
import { addDays, subDays } from 'date-fns';

describe('formatExpiration', () => {
    it('should return "Never" for undefined expiration', () => {
        const result = formatExpiration(undefined);

        expect(result.isExpiring).toBe(false);
        expect(result.isExpired).toBe(false);
        expect(result.daysUntilExpiration).toBe(null);
        expect(result.label).toBe('Never');
    });

    it('should detect expired keys', () => {
        const yesterday = subDays(new Date(), 1).toISOString();
        const result = formatExpiration(yesterday);

        expect(result.isExpired).toBe(true);
        expect(result.isExpiring).toBe(false);
        expect(result.label).toBe('Expired');
    });

    it('should detect keys expiring today', () => {
        const today = new Date().toISOString();
        const result = formatExpiration(today);

        expect(result.isExpired).toBe(false);
        expect(result.daysUntilExpiration).toBe(0);
        expect(result.label).toBe('Today');
    });

    it('should detect keys expiring tomorrow', () => {
        const tomorrow = addDays(new Date(), 1).toISOString();
        const result = formatExpiration(tomorrow);

        expect(result.isExpiring).toBe(true);
        expect(result.isExpired).toBe(false);
        expect(result.daysUntilExpiration).toBe(1);
        expect(result.label).toBe('Tomorrow');
    });

    it('should detect keys expiring within 30 days', () => {
        const fifteenDays = addDays(new Date(), 15).toISOString();
        const result = formatExpiration(fifteenDays);

        expect(result.isExpiring).toBe(true);
        expect(result.isExpired).toBe(false);
        expect(result.daysUntilExpiration).toBe(15);
        expect(result.label).toBe('15 days');
    });

    it('should not mark keys expiring after 30 days as expiring soon', () => {
        const sixtyDays = addDays(new Date(), 60).toISOString();
        const result = formatExpiration(sixtyDays);

        expect(result.isExpiring).toBe(false);
        expect(result.isExpired).toBe(false);
        expect(result.daysUntilExpiration).toBe(60);
        expect(result.label).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/); // Should be a date string
    });

    it('should handle keys expiring exactly in 30 days', () => {
        const thirtyDays = addDays(new Date(), 30).toISOString();
        const result = formatExpiration(thirtyDays);

        expect(result.isExpiring).toBe(true);
        expect(result.isExpired).toBe(false);
        expect(result.daysUntilExpiration).toBe(30);
        expect(result.label).toBe('30 days');
    });
});
