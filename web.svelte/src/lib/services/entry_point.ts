/**
 * Entry Point Service - Svelte/Vite Wrapper
 *
 * This file provides a configured EntryPoint singleton for use in the
 * Svelte web package. It uses the framework-agnostic EntryPoint from
 * web.commons which now owns its LinkNavigator internally.
 */

import {
    createEntryPoint,
    type EntryPoint,
    type HalObject,
} from '@houseofwolves/serverlesslaunchpad.web.commons';
import WebConfigurationStore from '../config/web_config_store';
import { logger } from '../logging/logger';

/**
 * Track if we're currently redirecting to prevent multiple redirects
 */
let isRedirecting = false;

/**
 * Handle 401 errors from entry point fetches
 * Entry point errors are in format "Failed to fetch API entry point: 401 Unauthorized"
 */
function handle401Error(error: any): boolean {
    const errorMessage = error?.message || String(error);
    if (errorMessage.includes(': 401 ')) {
        const isAuthPage = window.location.pathname.startsWith('/auth/');
        if (!isAuthPage && !isRedirecting) {
            isRedirecting = true;
            logger.warn('Session expired or invalid (entry point), redirecting to login', {
                path: window.location.pathname,
            });
            window.location.href = '/auth/signin';
            return true;
        }
    }
    return false;
}

/**
 * Create entry point service with configuration
 */
async function createConfiguredEntryPoint(): Promise<EntryPoint> {
    const config = await WebConfigurationStore.getConfig();

    return createEntryPoint({
        baseUrl: config.api.base_url,
        cacheTtl: 5 * 60 * 1000, // 5 minutes
    });
}

/**
 * Singleton entry point instance (lazy-initialized)
 */
let entryPointInstance: EntryPoint | null = null;
let entryPointPromise: Promise<EntryPoint> | null = null;

/**
 * Get the singleton entry point instance
 */
export async function getEntryPoint(): Promise<EntryPoint> {
    if (entryPointInstance) {
        return entryPointInstance;
    }

    if (entryPointPromise) {
        return entryPointPromise;
    }

    entryPointPromise = createConfiguredEntryPoint();
    entryPointInstance = await entryPointPromise;
    return entryPointInstance;
}

/**
 * Singleton entry point for direct usage
 * Note: This is a proxy that lazy-loads the real service
 * Includes 401 error handling to redirect to login on session expiration
 */
export const entryPoint = {
    async fetch(forceRefresh?: boolean): Promise<HalObject> {
        const ep = await getEntryPoint();
        try {
            return await ep.fetch(forceRefresh);
        } catch (error: any) {
            if (!handle401Error(error)) {
                throw error;
            }
            return new Promise<never>(() => {});
        }
    },
    async getLinkHref(rel: string | string[], params?: Record<string, any>): Promise<string | undefined> {
        const ep = await getEntryPoint();
        try {
            return await ep.getLinkHref(rel, params);
        } catch (error: any) {
            if (!handle401Error(error)) {
                throw error;
            }
            return new Promise<never>(() => {});
        }
    },
    async hasCapability(rel: string | string[]): Promise<boolean> {
        const ep = await getEntryPoint();
        try {
            return await ep.hasCapability(rel);
        } catch (error: any) {
            if (!handle401Error(error)) {
                throw error;
            }
            return new Promise<never>(() => {});
        }
    },
    async getCapabilities(): Promise<string[]> {
        const ep = await getEntryPoint();
        try {
            return await ep.getCapabilities();
        } catch (error: any) {
            if (!handle401Error(error)) {
                throw error;
            }
            return new Promise<never>(() => {});
        }
    },
    async getTemplateTarget(templateName: string): Promise<string | undefined> {
        const ep = await getEntryPoint();
        try {
            return await ep.getTemplateTarget(templateName);
        } catch (error: any) {
            if (!handle401Error(error)) {
                throw error;
            }
            return new Promise<never>(() => {});
        }
    },
    async getTemplate(templateName: string): Promise<any | null> {
        const ep = await getEntryPoint();
        try {
            return await ep.getTemplate(templateName);
        } catch (error: any) {
            if (!handle401Error(error)) {
                throw error;
            }
            return new Promise<never>(() => {});
        }
    },
    async hasTemplate(templateName: string): Promise<boolean> {
        const ep = await getEntryPoint();
        try {
            return await ep.hasTemplate(templateName);
        } catch (error: any) {
            if (!handle401Error(error)) {
                throw error;
            }
            return new Promise<never>(() => {});
        }
    },
    async clearCache(): Promise<void> {
        const ep = await getEntryPoint();
        return ep.clearCache();
    },
};

/**
 * Re-export types from web.commons
 */
export type { EntryPointConfig, EntryPoint } from '@houseofwolves/serverlesslaunchpad.web.commons';
export { createEntryPoint } from '@houseofwolves/serverlesslaunchpad.web.commons';
