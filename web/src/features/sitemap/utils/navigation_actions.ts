/**
 * Navigation Actions
 *
 * Handles execution of POST actions from navigation links, including:
 * - Making API requests
 * - Showing user feedback (loading, success, error)
 * - Navigating to destination routes
 */

import { NavigateFunction } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { apiClient, ApiClientError } from '../../../services/api.client';
import { mapEndpointToRoute, extractResourceName } from './endpoint_route_mapper';

/**
 * Execute POST navigation action and handle navigation
 *
 * Makes a POST request to the specified href, displays notifications
 * for user feedback, and navigates to the mapped route on success.
 *
 * @param href - API endpoint from sitemap
 * @param title - Display name for notifications
 * @param navigate - React Router navigate function
 * @returns Promise that resolves when action completes
 *
 * @example
 * ```typescript
 * await executePostAction(
 *   '/users/abc123/api_keys/list',
 *   'API Keys',
 *   navigate
 * );
 * ```
 */
export async function executePostAction(
    href: string,
    title: string,
    navigate: NavigateFunction
): Promise<void> {
    const resourceName = title || extractResourceName(href);

    try {
        // Execute POST request
        const response = await apiClient.post(href);

        // Find destination route
        const route = mapEndpointToRoute(href, 'POST');

        if (!route) {
            throw new Error(`No route mapping found for ${href}`);
        }

        // Navigate to destination route (success is implicit by navigation)
        navigate(route, {
            state: { data: response }, // Pass response data if needed by destination
        });
    } catch (error) {
        // Handle errors with user-friendly messages
        let errorMessage = 'An unexpected error occurred';

        if (error instanceof ApiClientError) {
            switch (error.status) {
                case 401:
                    errorMessage = 'Please sign in to continue';
                    break;
                case 403:
                    errorMessage = "You don't have permission to access this";
                    break;
                case 404:
                    errorMessage = 'Resource not found';
                    break;
                case 408:
                    errorMessage = 'Request timed out. Please try again';
                    break;
                case 500:
                case 502:
                case 503:
                    errorMessage = 'Server error. Please try again later';
                    break;
                default:
                    errorMessage = error.error?.message || error.message;
            }
        } else if (error instanceof Error) {
            if (error.name === 'AbortError') {
                errorMessage = 'Request was cancelled';
            } else if (error.message.includes('network') || error.message.includes('Network')) {
                errorMessage = 'Network error. Check your connection';
            } else {
                errorMessage = error.message;
            }
        }

        // Show error notification
        notifications.show({
            color: 'red',
            title: 'Error',
            message: `Failed to load ${resourceName}: ${errorMessage}`,
            autoClose: 5000,
            withCloseButton: true,
        });

        // Log error for debugging
        console.error('POST action failed:', {
            href,
            title,
            error,
            timestamp: new Date().toISOString(),
        });

        // Re-throw to allow caller to handle if needed
        throw error;
    }
}

/**
 * Create onClick handler for POST navigation items
 *
 * Returns an async function that can be attached to navigation link onClick.
 * The handler must be called with navigate function from the component context.
 *
 * @param href - API endpoint
 * @param title - Display name for the resource
 * @returns Factory function that creates the actual handler when given navigate
 *
 * @example
 * ```typescript
 * // In transform_navigation.ts
 * const onClick = createPostActionHandler(href, childItem.title);
 *
 * // In navbar_links_group.tsx (with navigate in scope)
 * onClick={() => handler(navigate)}
 * ```
 */
export function createPostActionHandler(
    href: string,
    title: string
): (navigate: NavigateFunction) => Promise<void> {
    return async (navigate: NavigateFunction) => {
        await executePostAction(href, title, navigate);
    };
}
