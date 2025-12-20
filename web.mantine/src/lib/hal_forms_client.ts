/**
 * HAL-FORMS Client - React/Vite Wrapper
 *
 * This file provides a wrapper around the framework-agnostic HAL-FORMS client
 * from web.commons. Configured with 401 error handling for consistent session
 * expiration behavior across all API calls.
 */

import { createHalFormsClient, type HalFormsClient, type HalObject } from '@houseofwolves/serverlesslaunchpad.web.commons';
import { getApiClient } from '../services/api.client';
import { logger } from '../logging/logger';

/**
 * Create HAL-FORMS client with configured API client and auth error handling
 */
async function createConfiguredHalClient(): Promise<HalFormsClient> {
    const apiClient = await getApiClient();
    return createHalFormsClient(apiClient, {
        onAuthError: () => {
            logger.warn('Session expired or invalid, reloading page', {
                path: window.location.pathname,
            });
            window.location.reload();
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
 * Singleton HAL client for direct usage
 * Note: This is a proxy that lazy-loads the real client
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
    async fetch(url: string, options?: { headers?: Record<string, string> }) {
        const client = await getHalClient();
        return client.fetch(url, options);
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
