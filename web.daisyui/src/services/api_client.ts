/**
 * API Client - React/Vite Wrapper
 *
 * This file provides a Vite-specific wrapper around the framework-agnostic
 * ApiClient from web.commons. It creates a singleton instance configured
 * with Vite environment variables and a logger.
 */

import { createApiClient, type ApiClient } from '@houseofwolves/serverlesslaunchpad.web.commons';
import WebConfigurationStore from '../configuration/web_config_store';
import { logger } from '../logging/logger';

/**
 * Create API client instance with lazy configuration loading
 */
async function createConfiguredApiClient(): Promise<ApiClient> {
    const config = await WebConfigurationStore.getConfig();

    return createApiClient({
        baseUrl: config.api.base_url,
        timeout: config.api.timeout,
        credentials: true, // Always include cookies
        mode: import.meta.env.MODE === 'development' || import.meta.env.MODE === 'moto' ? 'development' : 'production',
        logger: {
            debug: (message, context) => logger.debug(message, context),
            error: (message, context) => logger.error(message, context),
        },
    });
}

/**
 * Singleton API client instance (lazy-initialized)
 */
let apiClientInstance: ApiClient | null = null;
let apiClientPromise: Promise<ApiClient> | null = null;

/**
 * Get the singleton API client instance
 * Lazy-loads configuration on first access
 */
export async function getApiClient(): Promise<ApiClient> {
    if (apiClientInstance) {
        return apiClientInstance;
    }

    if (apiClientPromise) {
        return apiClientPromise;
    }

    apiClientPromise = createConfiguredApiClient();
    apiClientInstance = await apiClientPromise;
    return apiClientInstance;
}

/**
 * Singleton API client for direct usage
 * Note: This is a proxy that lazy-loads the real client
 */
export const apiClient = {
    async request<T>(path: string, options?: RequestInit) {
        const client = await getApiClient();
        return client.request<T>(path, options);
    },
    async get<T>(path: string, params?: Record<string, string>) {
        const client = await getApiClient();
        return client.get<T>(path, params);
    },
    async post<T>(path: string, data?: any) {
        const client = await getApiClient();
        return client.post<T>(path, data);
    },
    async put<T>(path: string, data?: any) {
        const client = await getApiClient();
        return client.put<T>(path, data);
    },
    async patch<T>(path: string, data?: any) {
        const client = await getApiClient();
        return client.patch<T>(path, data);
    },
    async delete<T>(path: string) {
        const client = await getApiClient();
        return client.delete<T>(path);
    },
    async health() {
        const client = await getApiClient();
        return client.health();
    },
};

/**
 * Re-export types from web.commons for convenience
 */
export type { ApiResponse, ApiError, ApiClientConfig } from '@houseofwolves/serverlesslaunchpad.web.commons';
export { ApiClientError } from '@houseofwolves/serverlesslaunchpad.web.commons';
