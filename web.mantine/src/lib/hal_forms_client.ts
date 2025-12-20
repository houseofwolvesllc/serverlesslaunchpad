/**
 * HAL-FORMS Client - React/Vite Wrapper
 *
 * This file provides a wrapper around the framework-agnostic HAL-FORMS client
 * from web.commons. It creates a singleton instance that uses the configured
 * API client.
 */

import { createHalFormsClient, type HalFormsClient } from '@houseofwolves/serverlesslaunchpad.web.commons';
import { getApiClient } from '../services/api.client';

/**
 * Create HAL-FORMS client with configured API client
 */
async function createConfiguredHalClient(): Promise<HalFormsClient> {
    const apiClient = await getApiClient();
    return createHalFormsClient(apiClient);
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
 */
export const halClient = {
    async fetch(url: string, options?: { headers?: Record<string, string> }) {
        const client = await getHalClient();
        return client.fetch(url, options);
    },
    async executeTemplate(template: any, data: Record<string, any>) {
        const client = await getHalClient();
        return client.executeTemplate(template, data);
    },
    validateTemplateData(template: any, data: Record<string, any>) {
        // Note: This is not async because validation is synchronous
        // We need to get the client instance but can't await in non-async function
        // For now, we'll import the class and create a temporary instance
        // This is a workaround since validation doesn't need the API client
        const { HalFormsClient } = require('@houseofwolves/serverlesslaunchpad.web.commons');
        const tempClient = new HalFormsClient({} as any);
        return tempClient.validateTemplateData(template, data);
    },
};

/**
 * Re-export types from web.commons
 */
export type { ValidationError } from '@houseofwolves/serverlesslaunchpad.web.commons';
export { createHalFormsClient } from '@houseofwolves/serverlesslaunchpad.web.commons';
