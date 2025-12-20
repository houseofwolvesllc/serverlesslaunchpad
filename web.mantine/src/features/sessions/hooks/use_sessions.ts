import { useCallback, useContext, useEffect, useState } from 'react';
import { apiClient } from '../../../services/api.client';
import { getEntryPoint } from '../../../services/entry_point_provider';
import { AuthenticationContext } from '../../authentication/context/authentication_context';
import { HalObject } from '@houseofwolves/serverlesslaunchpad.types/hal';

/**
 * Custom hook for managing user sessions with HAL-FORMS templates
 *
 * Returns the full HAL object containing:
 * - _embedded.sessions: Array of session resources
 * - _templates: Available operations (delete)
 * - _links: Navigation links
 *
 * @returns {object} HAL resource with sessions data and metadata
 *
 * @example
 * ```tsx
 * function SessionsPage() {
 *   const { data, loading, error, refresh } = useSessions();
 *   const deleteTemplate = data?._templates?.delete;
 *
 *   return (
 *     <HalCollectionList
 *       resource={data}
 *       onRefresh={refresh}
 *       onBulkDelete={handleBulkDelete}
 *     />
 *   );
 * }
 * ```
 */
export function useSessions() {
    const { signedInUser } = useContext(AuthenticationContext);

    // State
    const [data, setData] = useState<HalObject | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sessionsEndpoint, setSessionsEndpoint] = useState<string | null>(null);

    /**
     * Discover sessions endpoint via hypermedia
     */
    const discoverEndpoint = useCallback(async () => {
        if (!signedInUser) {
            setLoading(false);
            return;
        }

        try {
            const entryPoint = getEntryPoint();
            // Get sessions template target
            const sessionsHref = await entryPoint.getTemplateTarget('sessions');

            if (!sessionsHref) {
                throw new Error('Sessions endpoint not found');
            }

            setSessionsEndpoint(sessionsHref);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to discover sessions endpoint');
            setLoading(false);
        }
    }, [signedInUser]);

    /**
     * Fetch sessions HAL resource from API
     */
    const fetchSessions = useCallback(
        async () => {
            if (!sessionsEndpoint) return;

            setLoading(true);
            setError(null);

            try {
                // POST request to get sessions
                const response = await apiClient.post(sessionsEndpoint, {});

                // Store full HAL object
                setData(response as HalObject);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load sessions');
                setData(null);
            } finally {
                setLoading(false);
            }
        },
        [sessionsEndpoint]
    );

    /**
     * Refresh sessions list
     */
    const refresh = useCallback(() => {
        fetchSessions();
    }, [fetchSessions]);

    // Discover endpoint on mount
    useEffect(() => {
        discoverEndpoint();
    }, [discoverEndpoint]);

    // Fetch initial data when endpoint is discovered
    useEffect(() => {
        if (sessionsEndpoint) {
            fetchSessions();
        }
    }, [sessionsEndpoint, fetchSessions]);

    return {
        data,
        loading,
        error,
        refresh,
    };
}
