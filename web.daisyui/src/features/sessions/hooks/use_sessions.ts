import { useCallback, useContext, useEffect, useState } from 'react';
import { apiClient } from '../../../services/api.client';
import { getEntryPoint } from '../../../services/entry_point_provider';
import { AuthenticationContext } from '../../authentication/context/authentication_context';
import { type HalObject } from '@houseofwolves/serverlesslaunchpad.web.commons';

/**
 * Custom hook for managing user sessions with HAL-FORMS templates
 *
 * Returns the full HAL object containing:
 * - _embedded.sessions: Array of session resources
 * - _templates: Available operations (delete)
 * - _links: Navigation links
 *
 * Provides functionality to:
 * - Fetch sessions from the hypermedia API
 * - Identify and protect the current active session
 * - Handle loading and error states
 *
 * The hook discovers the sessions endpoint via hypermedia navigation:
 * Entry Point → Sessions Link
 *
 * @returns Session data and operation functions
 *
 * @example
 * ```tsx
 * function SessionsPage() {
 *   const { data, loading, error, refresh } = useSessions();
 *
 *   return (
 *     <HalCollectionList
 *       resource={data}
 *       onRefresh={refresh}
 *       customRenderers={{ userAgent: customUserAgentRenderer }}
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
     * Discover sessions endpoint from hypermedia API
     */
    const discoverEndpoint = useCallback(async () => {
        if (!signedInUser) {
            setLoading(false);
            return;
        }

        try {
            const entryPoint = getEntryPoint();
            // Get sessions template target (now in templates for POST operations)
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
     * Fetch sessions from API using POST
     */
    const fetchSessions = useCallback(async () => {
        if (!sessionsEndpoint) return;

        setLoading(true);
        setError(null);

        try {
            // POST request with empty body
            const response = await apiClient.post(sessionsEndpoint, {});

            // Store full HAL object
            setData(response as HalObject);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load sessions');
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [sessionsEndpoint]);

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
