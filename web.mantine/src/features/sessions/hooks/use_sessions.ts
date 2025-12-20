import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { halClient } from '../../../lib/hal_forms_client';
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
    const currentSessionId = signedInUser?.authContext?.sessionId || null;
    const { userId } = useParams<{ userId?: string }>();

    // State
    const [data, setData] = useState<HalObject | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sessionsEndpoint, setSessionsEndpoint] = useState<string | null>(null);

    /**
     * Discover sessions endpoint via HATEOAS
     *
     * For current user: Discover from entry point
     * For other users: Fetch user resource, discover from _templates.sessions
     */
    const discoverEndpoint = useCallback(async () => {
        if (!signedInUser) {
            setLoading(false);
            return;
        }

        try {
            let sessionsHref: string;

            if (userId) {
                // Fetch user resource to discover sessions endpoint (HATEOAS)
                const userResource = await halClient.get(`/users/${userId}`);

                // Extract sessions template from user resource
                const sessionsTemplate = userResource?._templates?.sessions;

                if (!sessionsTemplate?.target) {
                    throw new Error('Sessions not available for this user');
                }

                sessionsHref = sessionsTemplate.target;
            } else {
                // No userId - discover current user's sessions from entry point
                const entryPoint = getEntryPoint();
                const discoveredHref = await entryPoint.getTemplateTarget('sessions');

                if (!discoveredHref) {
                    throw new Error('Sessions endpoint not found');
                }

                sessionsHref = discoveredHref;
            }

            setSessionsEndpoint(sessionsHref);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to discover sessions endpoint');
            setLoading(false);
        }
    }, [signedInUser, userId]);

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
                const response = await halClient.post(sessionsEndpoint, {});

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

    /**
     * Extract sessions array from HAL response and mark current session
     * Protect the session matching the active slp_session cookie from deletion
     * This allows admins to delete other users' sessions but not their own active session
     */
    const sessions = useMemo(() => {
        if (!data?._embedded?.sessions) return [];

        return data._embedded.sessions.map((session: any) => ({
            ...session,
            isCurrent: session.sessionId === currentSessionId,
        }));
    }, [data, currentSessionId]);

    return {
        data,
        sessions,
        currentSessionId,
        loading,
        error,
        refresh,
    };
}
