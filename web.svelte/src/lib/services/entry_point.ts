/**
 * Entry Point Service - React/Vite Wrapper
 *
 * This file provides a Vite-specific wrapper around the framework-agnostic
 * EntryPoint service from web.commons. It creates a singleton instance
 * configured with the API base URL and provides backward-compatible convenience methods.
 */

import {
    createEntryPoint,
    createLinkNavigator,
    type EntryPoint as BaseEntryPoint,
    type HalObject,
} from '@houseofwolves/serverlesslaunchpad.web.commons';
import WebConfigurationStore from '../config/web_config_store';

/**
 * Extended EntryPoint with backward-compatible convenience methods
 * 
 * The web.commons EntryPoint requires passing linkNavigator as a parameter
 * for framework-agnostic design. This wrapper provides the old API where
 * linkNavigator is internal.
 */
export class ViteEntryPoint {
    private entryPoint: BaseEntryPoint;
    private linkNavigator = createLinkNavigator();

    constructor(entryPoint: BaseEntryPoint) {
        this.entryPoint = entryPoint;
    }

    // Delegate core methods to web.commons EntryPoint
    async fetch(forceRefresh?: boolean): Promise<HalObject> {
        return this.entryPoint.fetch(forceRefresh);
    }

    clearCache(): void {
        return this.entryPoint.clearCache();
    }

    /**
     * Get a link href from the entry point (backward-compatible)
     * Uses internal linkNavigator instance
     */
    async getLinkHref(rel: string | string[], params?: Record<string, any>): Promise<string | undefined> {
        return this.entryPoint.getLinkHref(rel, this.linkNavigator, params);
    }

    /**
     * Check if the API provides a specific capability
     */
    async hasCapability(rel: string | string[]): Promise<boolean> {
        return this.entryPoint.hasCapability(rel, this.linkNavigator);
    }

    /**
     * Get all available capabilities from the entry point
     */
    async getCapabilities(): Promise<string[]> {
        return this.entryPoint.getCapabilities(this.linkNavigator);
    }

    /**
     * Get a template target URL from the entry point
     */
    async getTemplateTarget(templateName: string): Promise<string | undefined> {
        const root = await this.fetch();
        return root._templates?.[templateName]?.target;
    }

    /**
     * Check if a template exists in the entry point
     */
    async hasTemplate(templateName: string): Promise<boolean> {
        const root = await this.fetch();
        return !!root._templates?.[templateName];
    }
}

/**
 * Create entry point service with configuration
 */
async function createConfiguredEntryPoint(): Promise<ViteEntryPoint> {
    const config = await WebConfigurationStore.getConfig();

    const baseEntryPoint = createEntryPoint({
        baseUrl: config.api.base_url,
        cacheTtl: 5 * 60 * 1000, // 5 minutes
    });

    return new ViteEntryPoint(baseEntryPoint);
}

/**
 * Singleton entry point instance (lazy-initialized)
 */
let entryPointInstance: ViteEntryPoint | null = null;
let entryPointPromise: Promise<ViteEntryPoint> | null = null;

/**
 * Get the singleton entry point instance
 */
export async function getEntryPoint(): Promise<ViteEntryPoint> {
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
    async fetch(forceRefresh?: boolean) {
        const ep = await getEntryPoint();
        return ep.fetch(forceRefresh);
    },
    async getLinkHref(rel: string | string[], params?: Record<string, any>) {
        const ep = await getEntryPoint();
        return ep.getLinkHref(rel, params);
    },
    async hasCapability(rel: string | string[]) {
        const ep = await getEntryPoint();
        return ep.hasCapability(rel);
    },
    async getCapabilities() {
        const ep = await getEntryPoint();
        return ep.getCapabilities();
    },
    async getTemplateTarget(templateName: string) {
        const ep = await getEntryPoint();
        return ep.getTemplateTarget(templateName);
    },
    async hasTemplate(templateName: string) {
        const ep = await getEntryPoint();
        return ep.hasTemplate(templateName);
    },
    async clearCache() {
        const ep = await getEntryPoint();
        return ep.clearCache();
    },
};

/**
 * Re-export types from web.commons
 */
export type { EntryPointConfig } from '@houseofwolves/serverlesslaunchpad.web.commons';
export { createEntryPoint } from '@houseofwolves/serverlesslaunchpad.web.commons';

// Export ViteEntryPoint as EntryPoint for backward compatibility
export type EntryPoint = ViteEntryPoint;
