import { ConfigurationStore, ConfigurationOptions } from "@houseofwolves/serverlesslaunchpad.core";

interface CacheEntry<T> {
    value: T;
    timestamp: number;
}

/**
 * Decorator that adds caching to any ConfigurationStore implementation.
 *
 * Features:
 * - Configurable TTL (default 15 minutes, supports Infinity for indefinite caching)
 * - Refresh option to bypass cache
 * - Memory-efficient single object cache
 * - Cache hit/miss logging
 */
export class CachedConfigurationStore<T> implements ConfigurationStore<T> {
    private cache: CacheEntry<T> | null = null;
    private readonly ttlMs: number;
    private readonly isInfinite: boolean;

    constructor(
        private readonly innerStore: ConfigurationStore<T>,
        ttlMinutes: number = 15
    ) {
        this.isInfinite = ttlMinutes === Infinity;
        this.ttlMs = this.isInfinite ? Infinity : ttlMinutes * 60 * 1000;
    }

    async get(options?: ConfigurationOptions): Promise<T> {
        // Check if we should bypass cache
        const shouldRefresh = options?.refresh || false;

        // Check if we have valid cached data
        if (!shouldRefresh && this.isCacheValid()) {
            console.debug(`[CachedConfigurationStore] Cache hit - returning cached configuration`);
            return this.cache!.value;
        }

        // Cache miss or refresh requested - load from inner store
        console.info(`[CachedConfigurationStore] ${shouldRefresh ? 'Refresh requested' : 'Cache miss'} - loading fresh configuration`);

        try {
            const value = await this.innerStore.get(options);

            // Update cache
            this.cache = {
                value,
                timestamp: Date.now()
            };

            const ttlDisplay = this.isInfinite ? 'infinite' : `${this.ttlMs / 1000 / 60} minutes`;
            console.info(`[CachedConfigurationStore] Configuration loaded and cached successfully (TTL: ${ttlDisplay})`);
            return value;

        } catch (error) {
            console.error(`[CachedConfigurationStore] Failed to load configuration from inner store:`, error);

            // If we have stale cached data, we could optionally return it here
            // For now, we'll just re-throw the error
            throw error;
        }
    }

    /**
     * Check if the cached configuration is still valid (within TTL)
     */
    private isCacheValid(): boolean {
        if (!this.cache) {
            return false;
        }

        // Infinite TTL - cache is always valid unless manually refreshed
        if (this.isInfinite) {
            return true;
        }

        const age = Date.now() - this.cache.timestamp;
        return age < this.ttlMs;
    }

    /**
     * Clear the cache manually
     */
    clearCache(): void {
        this.cache = null;
        console.debug(`[CachedConfigurationStore] Cache cleared manually`);
    }

    /**
     * Get cache statistics for monitoring
     */
    getCacheInfo(): { cached: boolean; age?: number; ttl: number } {
        if (!this.cache) {
            return { cached: false, ttl: this.ttlMs };
        }

        const age = Date.now() - this.cache.timestamp;
        return {
            cached: true,
            age,
            ttl: this.ttlMs
        };
    }
}