import { randomBytes } from 'crypto';

/**
 * API Key Generator
 *
 * Generates cryptographically secure API keys.
 * Keys use 32 bytes of entropy encoded as base62 for URL-safe representation.
 */

/**
 * Base62 alphabet (alphanumeric, no special characters)
 * Used for URL-safe encoding of random bytes
 */
const BASE62_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/**
 * Convert bytes to base62 string
 * @param bytes - Random bytes to encode
 * @returns Base62 encoded string
 */
function bytesToBase62(bytes: Buffer): string {
    let result = '';
    let num = BigInt('0x' + bytes.toString('hex'));

    while (num > 0) {
        const remainder = Number(num % 62n);
        result = BASE62_ALPHABET[remainder] + result;
        num = num / 62n;
    }

    // Pad to ensure consistent length (43 chars for 32 bytes)
    while (result.length < 43) {
        result = BASE62_ALPHABET[0] + result;
    }

    return result;
}

/**
 * Generate a secure API key
 *
 * Format: {random}
 * - random: 43 character base62 string (32 bytes entropy)
 *
 * @returns Secure API key string
 *
 * @example
 * ```typescript
 * const key = generateApiKey();
 * // Returns: "7vAHfS9Lm3kQwT4uB8pN6xZc2gY1jR5oMtWqDfKp8h"
 * ```
 */
export function generateApiKey(): string {
    // Generate 32 bytes of cryptographically secure random data
    const randomData = randomBytes(32);

    // Convert to base62 for URL-safe representation
    const randomString = bytesToBase62(randomData);

    // Return just the random string (no prefix)
    return randomString;
}
