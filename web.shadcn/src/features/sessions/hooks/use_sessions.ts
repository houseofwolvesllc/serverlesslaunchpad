import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { halClient } from '../../../lib/hal_forms_client';
import { getEntryPoint } from '../../../services/entry_point_provider';
import { AuthenticationContext } from '../../authentication/context/authentication_context';
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '@houseofwolves/serverlesslaunchpad.types/pagination';
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
    const { userId } = useParams<{ userId?: string }>();

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
        if (saved) {
            const parsed = parseInt(saved, 10) as PageSize;
            if (PAGE_SIZE_OPTIONS.includes(parsed)) {
                return parsed;
            }
        }
        return DEFAULT_PAGE_SIZE;
    });

    // Pagination history for backward navigation
    const [historyStack, setHistoryStack] = useState<any[]>([]);
    const [currentInstruction, setCurrentInstruction] = useState<any | null>(null);

    /**
     * Extract sessions array from HAL response and mark current session
     * Protect the session matching the active slp_session cookie from deletion
     * This allows admins to delete other users' sessions but not their own active session
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
        hasPrevious: historyStack.length > 0 || !!currentInstruction,  // Can go back if history exists or on page 2+
        pageSize,
    };

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

            const response = (await halClient.post(sessionsEndpoint, body)) as SessionsResponse;

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
     * Pushes current instruction to history before navigating forward
     */
    const handleNextPage = useCallback(() => {
        if (pagingInstructions?.next) {
            // Push current instruction to history stack
            if (currentInstruction) {
                setHistoryStack((prev) => [...prev, currentInstruction]);
            }
            // Set next as current
            setCurrentInstruction(pagingInstructions.next);
            fetchSessions(pagingInstructions.next);
        }
    }, [pagingInstructions, currentInstruction, fetchSessions]);

    /**
     * Handle previous page navigation
     * Pops instruction from history stack to navigate backward
     */
    const handlePreviousPage = useCallback(() => {
        if (historyStack.length > 0) {
            // Pop from history stack
            const previousInstruction = historyStack[historyStack.length - 1];
            setHistoryStack((prev) => prev.slice(0, -1));
            setCurrentInstruction(previousInstruction);
            fetchSessions(previousInstruction);
        } else if (currentInstruction) {
            // Go back to page 1 (no instruction)
            setCurrentInstruction(null);
            fetchSessions({ limit: pageSize });
        }
    }, [historyStack, currentInstruction, pageSize, fetchSessions]);

    /**
     * Handle page size change
     * Resets pagination, clears history, and persists preference to localStorage
     */
    const handlePageSizeChange = useCallback((newSize: PageSize) => {
        setPageSize(newSize);
        setSelectedIds(new Set()); // Clear selection
        setHistoryStack([]);  // Clear history
        setCurrentInstruction(null);  // Reset to page 1
        localStorage.setItem('sessions_page_size', newSize.toString());
        // Refetch with new page size from page 1
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

    // Fetch initial data when endpoint is discovered
    useEffect(() => {
        if (sessionsEndpoint && !hasInitiallyLoaded) {
            setHasInitiallyLoaded(true);

            // Clear any navigation state to prevent using stale pagination data
            if (location.state?.data) {
                window.history.replaceState({}, document.title);
            }

            // Always fetch with our pageSize state, ignore navigation data
            fetchSessions();
        }
    }, [sessionsEndpoint, hasInitiallyLoaded, location.state, fetchSessions]);

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
