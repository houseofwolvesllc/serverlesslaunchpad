/**
 * Entry Point Provider
 *
 * Singleton provider for the API entry point service.
 * Manages global entry point instance and capability refresh lifecycle.
 */

import { EntryPoint } from './entry_point';

let entryPointInstance: EntryPoint | null = null;

/**
 * Initialize the global entry point instance
 *
 * @param baseUrl - The API base URL
 * @throws Error if initialization fails
 */
export async function initializeEntryPoint(baseUrl: string): Promise<void> {
    entryPointInstance = new EntryPoint({
        baseUrl,
        cacheTtl: 5 * 60 * 1000, // 5 minutes cache
    });

    // Initial fetch to discover capabilities
    await entryPointInstance.fetch();
}

/**
 * Get the global entry point instance
 *
 * @returns The initialized EntryPoint instance
 * @throws Error if entry point not initialized
 */
export function getEntryPoint(): EntryPoint {
    if (!entryPointInstance) {
        throw new Error('Entry point not initialized. Call initializeEntryPoint() first.');
    }
    return entryPointInstance;
}

/**
 * Refresh entry point capabilities
 *
 * Should be called after authentication state changes (login, logout)
 *
 * @throws Error if entry point not initialized
 */
export async function refreshCapabilities(): Promise<void> {
    if (!entryPointInstance) {
        throw new Error('Entry point not initialized.');
    }
    await entryPointInstance.fetch(true); // Force refresh
}

/**
 * Clear the entry point instance
 *
 * Useful for testing or cleanup scenarios
 */
export function clearEntryPoint(): void {
    if (entryPointInstance) {
        entryPointInstance.clearCache();
    }
    entryPointInstance = null;
}
