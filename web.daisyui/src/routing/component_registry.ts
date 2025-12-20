/**
 * Component Registry
 *
 * Maps sitemap navigation IDs to React components for dynamic routing.
 *
 * Registry Pattern:
 * - Key: sitemap navigation item `id` field
 * - Value: React component to render for that route
 *
 * To add a new API resource:
 * 1. Backend: Create controller with @Route decorator
 * 2. Backend: Add to sitemap with unique `id`
 * 3. Frontend: Create React component
 * 4. Frontend: Register component here with matching `id`
 *
 * The API controls which routes exist; this registry controls how to render them.
 */

import { ComponentType } from 'react';
import { SessionsPage } from '../features/sessions';
import { ApiKeysPage } from '../features/api_keys';
import { Admin } from '../features/admin';

/**
 * Component registry mapping sitemap navigation IDs to React components
 *
 * This is the single source of truth for mapping navigation IDs to components.
 * When the API sitemap includes a navigation item with a given ID, the router
 * will look up the component here to render for that route.
 *
 * NOTE: Unregistered routes are handled by GenericResourceView catch-all
 */
export const componentRegistry: Record<string, ComponentType> = {
    // User resources
    sessions: SessionsPage,
    'api-keys': ApiKeysPage,

    // Admin resources
    admin: Admin,

    // Add new components here as API resources are added
    // Example:
    // 'webhooks': WebhooksList,
    // 'reports': ReportsList,
};

/**
 * Get the component for a given navigation ID
 *
 * @param id - Navigation item ID from sitemap
 * @returns Component to render, or null if no mapping exists
 *
 * @example
 * ```typescript
 * const Component = getComponentForId('sessions');
 * if (Component) {
 *   return <Component />;
 * }
 * ```
 */
export function getComponentForId(id: string): ComponentType | null {
    return componentRegistry[id] || null;
}

/**
 * Check if a navigation ID has a registered component
 *
 * @param id - Navigation item ID from sitemap
 * @returns True if component is registered
 *
 * @example
 * ```typescript
 * if (hasComponent('sessions')) {
 *   // Safe to generate route for this navigation item
 * }
 * ```
 */
export function hasComponent(id: string): boolean {
    return id in componentRegistry;
}
