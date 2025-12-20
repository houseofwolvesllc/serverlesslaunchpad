import { useCallback, useContext, useEffect, useState } from 'react';
import { apiClient } from '../../../services/api.client';
import { getEntryPoint } from '../../../services/entry_point_provider';
import { HalObject } from '@houseofwolves/serverlesslaunchpad.types/hal';
import { AuthenticationContext } from '../../authentication/context/authentication_context';

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

    // State
    const [data, setData] = useState<HalObject | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [apiKeysEndpoint, setApiKeysEndpoint] = useState<string | null>(null);

    /**
     * Discover API keys endpoint via hypermedia
     */
    const discoverEndpoint = useCallback(async () => {
        if (!signedInUser) {
            setLoading(false);
            return;
        }

        try {
            const entryPoint = getEntryPoint();
            // Get API keys template target (now in templates for POST operations)
            const apiKeysHref = await entryPoint.getTemplateTarget('api-keys');

            if (!apiKeysHref) {
                throw new Error('API keys endpoint not found');
            }

            setApiKeysEndpoint(apiKeysHref);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to discover API keys endpoint');
            setLoading(false);
        }
    }, [signedInUser]);

    /**
     * Fetch API keys HAL resource from API
     */
    const fetchApiKeys = useCallback(
        async () => {
            if (!apiKeysEndpoint) return;

            setLoading(true);
            setError(null);

            try {
                // POST request to get API keys
                const response = await apiClient.post(apiKeysEndpoint, {});

                // Store full HAL object
                setData(response as HalObject);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load API keys');
                setData(null);
            } finally {
                setLoading(false);
            }
        },
        [apiKeysEndpoint]
    );

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
