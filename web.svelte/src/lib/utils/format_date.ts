import { format } from 'date-fns';

/**
 * Format a date string to a user-friendly format
 *
 * @param dateString - ISO 8601 date string
 * @param formatString - date-fns format string (default: 'MMM d, yyyy h:mm a')
 * @returns Formatted date string
 */
export function formatDate(dateString: string, formatString: string = 'MMM d, yyyy h:mm a'): string {
    try {
        const date = new Date(dateString);
        return format(date, formatString);
    } catch {
        return dateString;
    }
}
