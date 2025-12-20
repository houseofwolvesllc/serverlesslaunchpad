import { useCallback, useContext, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { halClient } from '../../../lib/hal_forms_client';
import { getEntryPoint } from '../../../services/entry_point_provider';
import { AuthenticationContext } from '../../authentication/context/authentication_context';
import { type HalObject } from '@houseofwolves/serverlesslaunchpad.web.commons';

/**
 * Custom hook for managing API keys with HAL-FORMS templates
 *
 * Returns the full HAL object containing:
 * - _embedded.apiKeys: Array of API key resources
 * - _templates: Available operations (create, delete)
 * - _links: Navigation links
 *
 * @returns {object} HAL resource with API keys data and metadata
 *
 * @example
 * ```tsx
 * function ApiKeysPage() {
 *   const { data, loading, error, refresh } = useApiKeys();
 *
 *   const createTemplate = data?._templates?.create;
 *
 *   return (
 *     <HalCollectionList
 *       resource={data}
 *       onRefresh={refresh}
 *       onCreate={() => openCreateModal()}
 *     />
 *   );
 * }
 * ```
 */
export function useApiKeys() {
    const { signedInUser } = useContext(AuthenticationContext);
    const { userId } = useParams<{ userId?: string }>();

    // State
    const [data, setData] = useState<HalObject | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [apiKeysEndpoint, setApiKeysEndpoint] = useState<string | null>(null);

    /**
     * Discover API keys endpoint via HATEOAS
     *
     * For current user: Discover from entry point
     * For other users: Fetch user resource, discover from _templates.api-keys
     */
    const discoverEndpoint = useCallback(async () => {
        if (!signedInUser) {
            setLoading(false);
            return;
        }

        try {
            let apiKeysHref: string;

            if (userId) {
                // Fetch user resource to discover API keys endpoint (HATEOAS)
                const userResource = await halClient.get(`/users/${userId}`);

                // Extract api-keys template from user resource
                const apiKeysTemplate = userResource?._templates?.['api-keys'];

                if (!apiKeysTemplate?.target) {
                    throw new Error('API keys not available for this user');
                }

                apiKeysHref = apiKeysTemplate.target;
            } else {
                // No userId - discover current user's API keys from entry point
                const entryPoint = getEntryPoint();
                const discoveredHref = await entryPoint.getTemplateTarget('api-keys');

                if (!discoveredHref) {
                    throw new Error('API keys endpoint not found');
                }

                apiKeysHref = discoveredHref;
            }

            setApiKeysEndpoint(apiKeysHref);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to discover API keys endpoint');
            setLoading(false);
        }
    }, [signedInUser, userId]);

    /**
     * Fetch API keys HAL resource from API using POST
     */
    const fetchApiKeys = useCallback(async () => {
        if (!apiKeysEndpoint) return;

        setLoading(true);
        setError(null);

        try {
            // POST request with empty body
            const response = await halClient.post(apiKeysEndpoint, {});

            // Store full HAL object
            setData(response as HalObject);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load API keys');
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [apiKeysEndpoint]);

    /**
     * Refresh API keys list
     */
    const refresh = useCallback(() => {
        fetchApiKeys();
    }, [fetchApiKeys]);

    // Discover endpoint on mount
    useEffect(() => {
        discoverEndpoint();
    }, [discoverEndpoint]);

    // Fetch initial data when endpoint is discovered
    useEffect(() => {
        if (apiKeysEndpoint) {
            fetchApiKeys();
        }
    }, [apiKeysEndpoint, fetchApiKeys]);

    return {
        data,
        loading,
        error,
        refresh,
    };
}
