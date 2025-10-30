import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { apiClient } from '../../../services/api.client';
import { getEntryPoint } from '../../../services/entry_point_provider';
import { AuthenticationContext } from '../../authentication/context/authentication_context';
import { PageSize, PaginationState, PagingInstructions, SessionsResponse, UseSessionsResult } from '../types';

/**
 * Custom hook for managing user sessions with HAL-FORMS templates
 *
 * Returns the full HAL object containing:
 * - _embedded.sessions: Array of session resources
 * - _templates: Available operations (delete)
 * - _links: Navigation links
 * - paging: Pagination metadata
 *
 * Provides functionality to:
 * - Fetch sessions from the hypermedia API with cursor-based pagination
 * - Identify and protect the current active session
 * - Select sessions for bulk operations
 * - Persist pagination preferences to localStorage
 * - Handle loading and error states
 *
 * The hook discovers the sessions endpoint via hypermedia navigation:
 * Entry Point → Sessions Link
 *
 * Uses cursor-based pagination via POST requests with paging instructions.
 *
 * @returns {UseSessionsResult} Session data and operation functions
 *
 * @example
 * ```tsx
 * function SessionsPage() {
 *   const {
 *     data,
 *     sessions,
 *     loading,
 *     error,
 *     selectedIds,
 *     pagination,
 *     handleSelectionChange,
 *     handleSelectAll,
 *     handleNextPage,
 *     handlePreviousPage,
 *     handlePageSizeChange,
 *     refresh,
 *   } = useSessions();
 *
 *   const deleteTemplate = data?._templates?.delete;
 *
 *   if (loading) return <SessionsTableSkeleton />;
 *   if (error) return <Alert color="red">{error}</Alert>;
 *
 *   return (
 *     <>
 *       {deleteTemplate && (
 *         <Button onClick={() => openDeleteModal()}>
 *           {deleteTemplate.title}
 *         </Button>
 *       )}
 *       <Table>
 *         {sessions.map(session => (
 *           <SessionRow
 *             key={session.sessionId}
 *             session={session}
 *             onDelete={refresh}
 *           />
 *         ))}
 *       </Table>
 *     </>
 *   );
 * }
 * ```
 */
export function useSessions(): UseSessionsResult {
    const { signedInUser } = useContext(AuthenticationContext);
    const currentSessionId = signedInUser?.authContext?.sessionId || null;
    const location = useLocation();

    // State
    const [data, setData] = useState<SessionsResponse | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true); // Start with loading true
    const [error, setError] = useState<string | null>(null);
    const [sessionsEndpoint, setSessionsEndpoint] = useState<string | null>(null);
    const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false); // Track if we've loaded data

    // Pagination state with cursor-based paging
    const [pagingInstructions, setPagingInstructions] = useState<PagingInstructions | null>(null);
    const [pageSize, setPageSize] = useState<PageSize>(() => {
        const saved = localStorage.getItem('sessions_page_size');
        return saved ? (parseInt(saved, 10) as PageSize) : 25;
    });

    /**
     * Extract sessions array from HAL response and mark current session
     */
    const sessions = useMemo(() => {
        if (!data?._embedded?.sessions) return [];

        return data._embedded.sessions.map((session) => ({
            ...session,
            isCurrent: session.sessionId === currentSessionId,
        }));
    }, [data, currentSessionId]);

    const pagination: PaginationState = {
        hasNext: !!pagingInstructions?.next,
        hasPrevious: !!pagingInstructions?.previous,
        pageSize,
    };

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
            // Get sessions link directly from root - no need to fetch user resource
            const sessionsHref = await entryPoint.getLinkHref('sessions');

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
     * Fetch sessions from API using POST with paging instruction
     */
    const fetchSessions = useCallback(async (pagingInstruction?: any) => {
        if (!sessionsEndpoint) return;

        setLoading(true);
        setError(null);

        try {
            // POST request with paging instruction in body
            const body: any = {};
            if (pagingInstruction) {
                body.pagingInstruction = pagingInstruction;
            } else {
                // Initial load - set page size
                body.pagingInstruction = { limit: pageSize };
            }

            const response = (await apiClient.post(sessionsEndpoint, body)) as SessionsResponse;

            // Store full HAL object
            setData(response);
            setPagingInstructions(response.paging);

            // Clear selection when data changes
            setSelectedIds(new Set());
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load sessions');
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [sessionsEndpoint, pageSize]);

    /**
     * Handle next page navigation
     */
    const handleNextPage = useCallback(() => {
        if (pagingInstructions?.next) {
            fetchSessions(pagingInstructions.next);
        }
    }, [pagingInstructions, fetchSessions]);

    /**
     * Handle previous page navigation
     */
    const handlePreviousPage = useCallback(() => {
        if (pagingInstructions?.previous) {
            fetchSessions(pagingInstructions.previous);
        }
    }, [pagingInstructions, fetchSessions]);

    /**
     * Handle page size change
     */
    const handlePageSizeChange = useCallback((newSize: PageSize) => {
        setPageSize(newSize);
        setSelectedIds(new Set()); // Clear selection
        localStorage.setItem('sessions_page_size', newSize.toString());
        // Refetch with new page size
        fetchSessions({ limit: newSize });
    }, [fetchSessions]);

    /**
     * Handle individual session selection
     */
    const handleSelectionChange = useCallback((sessionId: string, selected: boolean) => {
        setSelectedIds((prev) => {
            const newSet = new Set(prev);
            if (selected) {
                newSet.add(sessionId);
            } else {
                newSet.delete(sessionId);
            }
            return newSet;
        });
    }, []);

    /**
     * Handle select all
     */
    const handleSelectAll = useCallback(
        (checked: boolean) => {
            if (checked) {
                // Select all except current session
                const selectableIds = sessions
                    .filter((s) => s.sessionId !== currentSessionId)
                    .map((s) => s.sessionId);
                setSelectedIds(new Set(selectableIds));
            } else {
                setSelectedIds(new Set());
            }
        },
        [sessions, currentSessionId]
    );

    /**
     * Refresh sessions list
     */
    const refresh = useCallback(() => {
        if (pagingInstructions?.current) {
            fetchSessions(pagingInstructions.current);
        } else {
            fetchSessions();
        }
    }, [pagingInstructions, fetchSessions]);

    // Discover endpoint on mount
    useEffect(() => {
        discoverEndpoint();
    }, [discoverEndpoint]);

    // Check if we received data from navigation state (from POST action)
    useEffect(() => {
        const navigationData = location.state?.data as SessionsResponse | undefined;

        if (navigationData && sessionsEndpoint) {
            // Use the data from navigation instead of fetching
            setData(navigationData);
            setPagingInstructions(navigationData.paging);
            setError(null); // Clear any previous errors
            setLoading(false); // Ensure loading is false
            setHasInitiallyLoaded(true);

            // Clear the navigation state to prevent reuse on subsequent renders
            window.history.replaceState({}, document.title);
        } else if (sessionsEndpoint && !hasInitiallyLoaded) {
            // No navigation data, fetch initial page
            setHasInitiallyLoaded(true);
            fetchSessions();
        }
    }, [sessionsEndpoint, location.state, hasInitiallyLoaded, fetchSessions]);

    return {
        data,
        sessions,
        loading,
        error,
        selectedIds,
        currentSessionToken: currentSessionId,
        pagination,
        handleSelectionChange,
        handleSelectAll,
        handleNextPage,
        handlePreviousPage,
        handlePageSizeChange,
        refresh,
    };
}
