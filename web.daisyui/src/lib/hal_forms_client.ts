/**
 * HAL Forms Client
 *
 * Wrapper around web.commons createHalFormsClient with lazy-loaded API client dependency.
 * Configured with 401 error handling for consistent session expiration behavior.
 */

import { createHalFormsClient, type HalObject } from '@houseofwolves/serverlesslaunchpad.web.commons';
import { getApiClient } from '../services/api.client';
import { logger } from '../logging/logger';

/**
 * Lazy HAL Forms Client
 * Uses singleton pattern with lazy initialization to avoid circular dependencies
 *
 * This is the ONLY client that should be used for API interactions.
 * All methods include proper HAL Accept headers and 401 error handling.
 */
class LazyHalFormsClient {
    private client: ReturnType<typeof createHalFormsClient> | null = null;

    private async ensureInitialized() {
        if (!this.client) {
            const apiClient = await getApiClient();
            this.client = createHalFormsClient(apiClient, {
                onAuthError: () => {
                    logger.warn('Session expired or invalid, reloading page', {
                        path: window.location.pathname,
                    });
                    window.location.reload();
                },
            });
        }
    }

    /**
     * GET a HAL resource
     */
    async get<T extends HalObject = HalObject>(url: string): Promise<T> {
        await this.ensureInitialized();
        return this.client!.get<T>(url);
    }

    /**
     * POST to a HAL endpoint
     */
    async post<T extends HalObject = HalObject>(url: string, data?: any): Promise<T> {
        await this.ensureInitialized();
        return this.client!.post<T>(url, data);
    }

    /**
     * PUT to a HAL endpoint
     */
    async put<T extends HalObject = HalObject>(url: string, data?: any): Promise<T> {
        await this.ensureInitialized();
        return this.client!.put<T>(url, data);
    }

    /**
     * PATCH a HAL endpoint
     */
    async patch<T extends HalObject = HalObject>(url: string, data?: any): Promise<T> {
        await this.ensureInitialized();
        return this.client!.patch<T>(url, data);
    }

    /**
     * DELETE a HAL resource
     */
    async delete<T extends HalObject = HalObject>(url: string): Promise<T> {
        await this.ensureInitialized();
        return this.client!.delete<T>(url);
    }

    /**
     * Fetch a HAL resource (alias for get with custom headers support)
     */
    async fetch(url: string, options?: { headers?: Record<string, string> }) {
        await this.ensureInitialized();
        return this.client!.fetch(url, options);
    }

    /**
     * Execute a HAL-FORMS template
     */
    async executeTemplate(template: any, data: Record<string, any>) {
        await this.ensureInitialized();
        return this.client!.executeTemplate(template, data);
    }

    /**
     * Validate template data
     */
    async validateTemplateData(template: any, data: Record<string, any>) {
        await this.ensureInitialized();
        return this.client!.validateTemplateData(template, data);
    }
}

/**
 * Singleton HAL Forms Client instance
 */
export const halClient = new LazyHalFormsClient();

/**
 * Re-export types from web.commons
 */
export type { ValidationError } from '@houseofwolves/serverlesslaunchpad.web.commons';
