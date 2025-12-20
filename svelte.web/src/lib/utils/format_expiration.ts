import { differenceInDays, isPast } from 'date-fns';

export interface ExpirationInfo {
    isExpiring: boolean;
    isExpired: boolean;
    daysUntilExpiration: number | null;
    label: string;
}

/**
 * Format API key expiration date with warning indicators
 *
 * @param dateExpires - ISO 8601 date string or undefined for never-expiring keys
 * @returns Expiration information for display
 */
export function formatExpiration(dateExpires?: string): ExpirationInfo {
    if (!dateExpires) {
        return {
            isExpiring: false,
            isExpired: false,
            daysUntilExpiration: null,
            label: 'Never',
        };
    }

    const expirationDate = new Date(dateExpires);
    const now = new Date();

    const isExpired = isPast(expirationDate);
    const daysUntilExpiration = differenceInDays(expirationDate, now);
    const isExpiring = !isExpired && daysUntilExpiration <= 30;

    let label: string;
    if (isExpired) {
        label = 'Expired';
    } else if (daysUntilExpiration === 0) {
        label = 'Today';
    } else if (daysUntilExpiration === 1) {
        label = 'Tomorrow';
    } else if (daysUntilExpiration <= 30) {
        label = `${daysUntilExpiration} days`;
    } else {
        label = expirationDate.toLocaleDateString();
    }

    return {
        isExpiring,
        isExpired,
        daysUntilExpiration,
        label,
    };
}
