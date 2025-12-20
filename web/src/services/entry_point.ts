/**
 * Entry Point Service
 *
 * Manages the API entry point and provides methods for discovering
 * available capabilities and resources from the root of the API.
 *
 * This service implements HATEOAS principles by querying the API root
 * and caching the available links for the current user session.
 */

import type { HalObject } from '../types/hal';
import { linkNavigator } from './link_navigator';

/**
 * Configuration for the Entry Point Service
 */
export interface EntryPointConfig {
    /** Base URL of the API (e.g., 'https://api.example.com') */
    baseUrl: string;

    /** Optional headers to include with every request */
    defaultHeaders?: Record<string, string>;

    /** Cache TTL in milliseconds (default: 5 minutes) */
    cacheTtl?: number;
}

/**
 * Cached entry point data
 */
interface CachedEntryPoint {
    data: HalObject;
    timestamp: number;
}

/**
 * Entry Point Service for API discovery
 */
export class EntryPoint {
    private config: Required<EntryPointConfig>;
    private cache: CachedEntryPoint | null = null;

    constructor(config: EntryPointConfig) {
        this.config = {
            baseUrl: config.baseUrl,
            defaultHeaders: config.defaultHeaders || {},
            cacheTtl: config.cacheTtl || 5 * 60 * 1000, // 5 minutes default
        };
    }

    /**
     * Fetch the API entry point (root resource)
     * Results are cached according to cacheTtl
     *
     * @param forceRefresh - Force a fresh fetch, bypassing cache
     * @returns The root HAL resource
     *
     * @example
     * const root = await entryPoint.fetch();
     * const userHref = linkNavigator.getHref(root, 'user');
     */
    async fetch(forceRefresh: boolean = false): Promise<HalObject> {
        // Check cache first
        if (!forceRefresh && this.cache && this.isCacheValid()) {
            return this.cache.data;
        }

        // Fetch from API
        const response = await fetch(this.config.baseUrl, {
            method: 'GET',
            credentials: 'include', // Include cookies for session management
            headers: {
                'Accept': 'application/hal+json, application/json',
                ...this.config.defaultHeaders,
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch API entry point: ${response.status} ${response.statusText}`);
        }

        const data = await response.json() as HalObject;

        // Update cache
        this.cache = {
            data,
            timestamp: Date.now(),
        };

        return data;
    }

    /**
     * Get a link href from the entry point
     * Convenience method that fetches and extracts link in one call
     *
     * @param rel - Link relation to find
     * @param params - Optional parameters for URI template expansion
     * @returns The href or undefined if not found
     *
     * @example
     * const sessionsUrl = await entryPoint.getLinkHref('sessions', { userId: '123' });
     */
    async getLinkHref(rel: string | string[], params?: Record<string, any>): Promise<string | undefined> {
        const root = await this.fetch();
        return linkNavigator.getHref(root, rel, params);
    }

    /**
     * Check if the API provides a specific capability
     * Useful for feature flags and conditional UI
     *
     * @param rel - Link relation to check
     * @returns True if the capability exists
     *
     * @example
     * const hasAdmin = await entryPoint.hasCapability('admin');
     * if (hasAdmin) {
     *   // Show admin menu
     * }
     */
    async hasCapability(rel: string | string[]): Promise<boolean> {
        const root = await this.fetch();
        return linkNavigator.hasCapability(root, rel);
    }

    /**
     * Get all available capabilities from the entry point
     * Returns all link relations
     *
     * @returns Array of available link relations
     *
     * @example
     * const capabilities = await entryPoint.getCapabilities();
     * // Returns: ['self', 'user', 'sessions', 'api-keys', 'sitemap']
     */
    async getCapabilities(): Promise<string[]> {
        const root = await this.fetch();
        return linkNavigator.getAvailableRelations(root);
    }

    /**
     * Clear the cache
     * Forces next fetch to retrieve fresh data
     */
    clearCache(): void {
        this.cache = null;
    }

    /**
     * Check if cached data is still valid
     */
    private isCacheValid(): boolean {
        if (!this.cache) {
            return false;
        }

        const age = Date.now() - this.cache.timestamp;
        return age < this.config.cacheTtl;
    }

    /**
     * Update the authentication token
     * Clears cache and updates default headers
     *
     * @param token - The authentication token
     *
     * @example
     * entryPoint.setAuthToken('Bearer abc123...');
     */
    setAuthToken(token: string): void {
        this.config.defaultHeaders['Authorization'] = token;
        this.clearCache(); // Clear cache as capabilities may change with auth
    }

    /**
     * Remove the authentication token
     * Clears cache as capabilities may change
     */
    clearAuthToken(): void {
        delete this.config.defaultHeaders['Authorization'];
        this.clearCache();
    }

    /**
     * Get the current base URL
     */
    getBaseUrl(): string {
        return this.config.baseUrl;
    }

    /**
     * Update the base URL
     * Clears cache as this is a different API
     *
     * @param baseUrl - New base URL
     */
    setBaseUrl(baseUrl: string): void {
        this.config.baseUrl = baseUrl;
        this.clearCache();
    }

    /**
     * Get the cached entry point data if available
     * Returns undefined if cache is empty or expired
     */
    getCachedData(): HalObject | undefined {
        if (this.cache && this.isCacheValid()) {
            return this.cache.data;
        }
        return undefined;
    }
}

/**
 * Factory function to create an Entry Point instance
 *
 * @param config - Entry point configuration
 * @returns New EntryPoint instance
 */
export function createEntryPoint(config: EntryPointConfig): EntryPoint {
    return new EntryPoint(config);
}
