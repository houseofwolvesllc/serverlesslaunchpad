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
 * Includes 401 error handling to redirect to login on session expiration
 */
export const apiClient = {
    async request<T>(path: string, options?: RequestInit) {
        const client = await getApiClient();
        try {
            return await client.request<T>(path, options);
        } catch (error: any) {
            // Handle 401 Unauthorized - session expired or invalid
            if (error?.status === 401) {
                const isAuthPage = window.location.pathname.startsWith('/auth/');
                if (!isAuthPage) {
                    logger.warn('Session expired or invalid, redirecting to login', {
                        path: window.location.pathname,
                    });
                    // Redirect to login page with full page reload
                    window.location.href = '/auth/signin';
                } else {
                    logger.debug('401 error on auth page, not redirecting', {
                        path: window.location.pathname,
                    });
                }
            }
            throw error;
        }
    },
    async get<T>(path: string, params?: Record<string, string>) {
        const client = await getApiClient();
        try {
            return await client.get<T>(path, params);
        } catch (error: any) {
            if (error?.status === 401) {
                const isAuthPage = window.location.pathname.startsWith('/auth/');
                if (!isAuthPage) {
                    logger.warn('Session expired or invalid, redirecting to login', {
                        path: window.location.pathname,
                    });
                    window.location.href = '/auth/signin';
                }
            }
            throw error;
        }
    },
    async post<T>(path: string, data?: any) {
        const client = await getApiClient();
        try {
            return await client.post<T>(path, data);
        } catch (error: any) {
            if (error?.status === 401) {
                const isAuthPage = window.location.pathname.startsWith('/auth/');
                if (!isAuthPage) {
                    logger.warn('Session expired or invalid, redirecting to login', {
                        path: window.location.pathname,
                    });
                    window.location.href = '/auth/signin';
                }
            }
            throw error;
        }
    },
    async put<T>(path: string, data?: any) {
        const client = await getApiClient();
        try {
            return await client.put<T>(path, data);
        } catch (error: any) {
            if (error?.status === 401) {
                const isAuthPage = window.location.pathname.startsWith('/auth/');
                if (!isAuthPage) {
                    logger.warn('Session expired or invalid, redirecting to login', {
                        path: window.location.pathname,
                    });
                    window.location.href = '/auth/signin';
                }
            }
            throw error;
        }
    },
    async patch<T>(path: string, data?: any) {
        const client = await getApiClient();
        try {
            return await client.patch<T>(path, data);
        } catch (error: any) {
            if (error?.status === 401) {
                const isAuthPage = window.location.pathname.startsWith('/auth/');
                if (!isAuthPage) {
                    logger.warn('Session expired or invalid, redirecting to login', {
                        path: window.location.pathname,
                    });
                    window.location.href = '/auth/signin';
                }
            }
            throw error;
        }
    },
    async delete<T>(path: string) {
        const client = await getApiClient();
        try {
            return await client.delete<T>(path);
        } catch (error: any) {
            if (error?.status === 401) {
                const isAuthPage = window.location.pathname.startsWith('/auth/');
                if (!isAuthPage) {
                    logger.warn('Session expired or invalid, redirecting to login', {
                        path: window.location.pathname,
                    });
                    window.location.href = '/auth/signin';
                }
            }
            throw error;
        }
    },
    async health() {
        const client = await getApiClient();
        try {
            return await client.health();
        } catch (error: any) {
            if (error?.status === 401) {
                const isAuthPage = window.location.pathname.startsWith('/auth/');
                if (!isAuthPage) {
                    logger.warn('Session expired or invalid, redirecting to login', {
                        path: window.location.pathname,
                    });
                    window.location.href = '/auth/signin';
                }
            }
            throw error;
        }
    },
};

/**
 * Re-export types from web.commons for convenience
 */
export type { ApiResponse, ApiError, ApiClientConfig } from '@houseofwolves/serverlesslaunchpad.web.commons';
export { ApiClientError } from '@houseofwolves/serverlesslaunchpad.web.commons';
