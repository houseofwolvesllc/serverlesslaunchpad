/**
 * Entry Point Provider - Vite Wrapper
 *
 * This file provides a wrapper around the framework-agnostic EntryPoint
 * from web.commons. It manages the global entry point instance and 
 * capability refresh lifecycle for the React/Vite application.
 */

import { getEntryPoint as getConfiguredEntryPoint, type ViteEntryPoint } from './entry_point';

let entryPointInstance: ViteEntryPoint | null = null;

/**
 * Initialize the global entry point instance
 *
 * Note: The baseUrl is configured from web_config_store, not passed as a parameter
 * @throws Error if initialization fails
 */
export async function initializeEntryPoint(): Promise<void> {
    // Use the configured entry point from our wrapper
    entryPointInstance = await getConfiguredEntryPoint();

    // Initial fetch to discover capabilities
    await entryPointInstance.fetch();
}

/**
 * Get the global entry point instance
 *
 * @returns The initialized EntryPoint instance
 * @throws Error if entry point not initialized
 */
export function getEntryPoint(): ViteEntryPoint {
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
