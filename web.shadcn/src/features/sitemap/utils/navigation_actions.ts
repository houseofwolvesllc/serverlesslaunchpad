/**
 * Navigation Actions
 *
 * Handles execution of POST actions from navigation links, including:
 * - Making API requests
 * - Showing user feedback (loading, success, error)
 * - Navigating to destination routes
 */

import { NavigateFunction } from 'react-router-dom';
import { toast } from 'sonner';
import { apiClient, ApiClientError } from '../../../services/api.client';
import { logger } from '../../../logging/logger';

/**
 * Extract resource name from href for display purposes
 *
 * @param href - API endpoint
 * @returns Human-readable resource name
 *
 * @example
 * ```typescript
 * extractResourceName('/users/abc123/api-keys/list')
 * // Returns: 'Api Keys'
 * ```
 */
function extractResourceName(href: string): string {
    // Extract the resource part (e.g., 'api-keys', 'sessions')
    const match = href.match(/\/([^/]+)\/list$/);
    if (match) {
        const resource = match[1];
        // Convert kebab-case to Title Case
        return resource
            .split('-')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    // Fallback: use href
    return href;
}

/**
 * Execute POST navigation action and handle navigation
 *
 * Makes a POST request to the specified href and navigates to the
 * self link from the response (HATEOAS principle).
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
        console.log('[POST Action] Executing POST to:', href);
        // Execute POST request
        const response = await apiClient.post(href);

        // Check for special navigation cases
        const federateHref = response._links?.federate?.href;

        // If response includes a federate link, it means session was revoked
        // and we need to return to unauthenticated state (e.g., logout)
        // Use full page reload to clear all React state and auth context
        if (federateHref) {
            window.location.href = '/auth/signin';
            return;
        }

        // POST-only API: navigate to the href we just called
        // The POST endpoint IS the resource identifier (no self link needed)
        // Pass response data AND navigation source via state
        console.log('[POST Action] Navigating to:', href, 'with state:', {
            data: '(response data)',
            navigationSource: 'menu'
        });
        navigate(href, {
            state: {
                data: response,
                navigationSource: 'menu'  // Mark as menu navigation for breadcrumb tracking
            },
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
        toast.error(`Failed to load ${resourceName}`, {
            description: errorMessage,
        });

        // Log error for debugging
        logger.error('POST action failed', {
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
