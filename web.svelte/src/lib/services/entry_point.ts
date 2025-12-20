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
 */
export const entryPoint = {
    async fetch(forceRefresh?: boolean): Promise<HalObject> {
        const ep = await getEntryPoint();
        return ep.fetch(forceRefresh);
    },
    async getLinkHref(rel: string | string[], params?: Record<string, any>): Promise<string | undefined> {
        const ep = await getEntryPoint();
        return ep.getLinkHref(rel, params);
    },
    async hasCapability(rel: string | string[]): Promise<boolean> {
        const ep = await getEntryPoint();
        return ep.hasCapability(rel);
    },
    async getCapabilities(): Promise<string[]> {
        const ep = await getEntryPoint();
        return ep.getCapabilities();
    },
    async getTemplateTarget(templateName: string): Promise<string | undefined> {
        const ep = await getEntryPoint();
        return ep.getTemplateTarget(templateName);
    },
    async getTemplate(templateName: string): Promise<any | null> {
        const ep = await getEntryPoint();
        return ep.getTemplate(templateName);
    },
    async hasTemplate(templateName: string): Promise<boolean> {
        const ep = await getEntryPoint();
        return ep.hasTemplate(templateName);
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
