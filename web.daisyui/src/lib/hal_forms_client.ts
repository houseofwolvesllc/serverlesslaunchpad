/**
 * HAL Forms Client
 *
 * Wrapper around web.commons createHalFormsClient with lazy-loaded API client dependency.
 */

import { createHalFormsClient } from '@houseofwolves/serverlesslaunchpad.web.commons';
import { getApiClient } from '../services/api.client';

/**
 * Lazy HAL Forms Client
 * Uses singleton pattern with lazy initialization to avoid circular dependencies
 */
class LazyHalFormsClient {
    private client: ReturnType<typeof createHalFormsClient> | null = null;

    private async ensureInitialized() {
        if (!this.client) {
            const apiClient = await getApiClient();
            this.client = createHalFormsClient(apiClient);
        }
    }

    async fetch(url: string, options?: { headers?: Record<string, string> }) {
        await this.ensureInitialized();
        return this.client!.fetch(url, options);
    }

    async executeTemplate(template: any, data: Record<string, any>) {
        await this.ensureInitialized();
        return this.client!.executeTemplate(template, data);
    }

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
