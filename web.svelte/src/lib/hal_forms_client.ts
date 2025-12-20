/**
 * HAL-FORMS Client - Svelte Wrapper
 *
 * This file provides a wrapper around the framework-agnostic HAL-FORMS client
 * from web.commons. Configured with 401 error handling for consistent session
 * expiration behavior across all API calls.
 */

import { createHalFormsClient, type HalFormsClient, type HalObject } from '@houseofwolves/serverlesslaunchpad.web.commons';
import { getApiClient } from './services/api_client';
import { logger } from './logging/logger';

/**
 * Track if we're currently handling a 401 redirect
 */
let isRedirecting = false;

/**
 * Create HAL-FORMS client with configured API client and auth error handling
 */
async function createConfiguredHalClient(): Promise<HalFormsClient> {
    const apiClient = await getApiClient();
    return createHalFormsClient(apiClient, {
        onAuthError: () => {
            if (!isRedirecting) {
                isRedirecting = true;
                logger.warn('Session expired or invalid, redirecting to login', {
                    path: window.location.pathname,
                });
                window.location.href = '/auth/signin';
            }
        },
    });
}

/**
 * Singleton HAL client instance (lazy-initialized)
 */
let halClientInstance: HalFormsClient | null = null;
let halClientPromise: Promise<HalFormsClient> | null = null;

/**
 * Get the singleton HAL client instance
 */
export async function getHalClient(): Promise<HalFormsClient> {
    if (halClientInstance) {
        return halClientInstance;
    }

    if (halClientPromise) {
        return halClientPromise;
    }

    halClientPromise = createConfiguredHalClient();
    halClientInstance = await halClientPromise;
    return halClientInstance;
}

/**
 * Handle 401 errors - redirect to signin and suppress error
 * Returns true if error was handled, false otherwise
 */
function handle401Error(error: any): boolean {
    if (error?.status === 401) {
        const isAuthPage = window.location.pathname.startsWith('/auth/');
        if (!isAuthPage && !isRedirecting) {
            isRedirecting = true;
            logger.warn('Session expired or invalid, redirecting to login', {
                path: window.location.pathname,
            });
            window.location.href = '/auth/signin';
            return true;
        }
    }
    return false;
}

/**
 * Singleton HAL client for direct usage
 * Note: This is a proxy that lazy-loads the real client
 * Includes 401 error handling to redirect to login on session expiration
 *
 * This is the ONLY client that should be used for API interactions.
 * All methods include proper HAL Accept headers and 401 error handling.
 */
export const halClient = {
    /**
     * GET a HAL resource
     */
    async get<T extends HalObject = HalObject>(url: string): Promise<T> {
        const client = await getHalClient();
        return client.get<T>(url);
    },

    /**
     * POST to a HAL endpoint
     */
    async post<T extends HalObject = HalObject>(url: string, data?: any): Promise<T> {
        const client = await getHalClient();
        return client.post<T>(url, data);
    },

    /**
     * PUT to a HAL endpoint
     */
    async put<T extends HalObject = HalObject>(url: string, data?: any): Promise<T> {
        const client = await getHalClient();
        return client.put<T>(url, data);
    },

    /**
     * PATCH a HAL endpoint
     */
    async patch<T extends HalObject = HalObject>(url: string, data?: any): Promise<T> {
        const client = await getHalClient();
        return client.patch<T>(url, data);
    },

    /**
     * DELETE a HAL resource
     */
    async delete<T extends HalObject = HalObject>(url: string): Promise<T> {
        const client = await getHalClient();
        return client.delete<T>(url);
    },

    /**
     * Fetch a HAL resource (alias for get with custom headers support)
     */
    async fetch(url: string) {
        const client = await getHalClient();
        return client.fetch(url);
    },

    /**
     * Execute a HAL-FORMS template
     */
    async executeTemplate(template: any, data: Record<string, any>) {
        const client = await getHalClient();
        return client.executeTemplate(template, data);
    },

    /**
     * Validate template data
     */
    validateTemplateData(template: any, data: Record<string, any>) {
        // Note: This is synchronous, so we need to get the client instance
        // For now, create a temporary client just for validation
        // In practice, the client should already be initialized
        if (!halClientInstance) {
            throw new Error('HAL client not initialized. Call any async method first.');
        }
        return halClientInstance.validateTemplateData(template, data);
    },
};

/**
 * Re-export types from web.commons
 */
export type { ValidationError } from '@houseofwolves/serverlesslaunchpad.web.commons';
export { createHalFormsClient } from '@houseofwolves/serverlesslaunchpad.web.commons';
