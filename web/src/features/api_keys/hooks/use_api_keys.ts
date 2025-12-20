import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { apiClient } from '../../../services/api.client';
import { getEntryPoint } from '../../../services/entry_point_provider';
import { HalObject } from '../../../types/hal';
import { AuthenticationContext } from '../../authentication/context/authentication_context';
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS, PageSize } from '../../../constants/pagination';

const STORAGE_KEY = 'api_keys_page_size';

/**
 * Custom hook for managing API keys with HAL-FORMS templates
 *
 * Returns the full HAL object containing:
 * - _embedded.apiKeys: Array of API key resources
 * - _templates: Available operations (create, delete)
 * - _links: Navigation links
 * - paging: Pagination metadata
 *
 * @returns {object} HAL resource with API keys data and metadata
 *
 * @example
 * ```tsx
 * function ApiKeysPage() {
 *   const {
 *     data,
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
 *   } = useApiKeys();
 *
 *   const apiKeys = data?._embedded?.apiKeys || [];
 *   const createTemplate = data?._templates?.create;
 *
 *   return (
 *     <>
 *       {createTemplate && (
 *         <Button onClick={() => openCreateModal()}>
 *           {createTemplate.title}
 *         </Button>
 *       )}
 *       <Table>
 *         {apiKeys.map(apiKey => (
 *           <ApiKeyRow key={apiKey.apiKeyId} apiKey={apiKey} />
 *         ))}
 *       </Table>
 *     </>
 *   );
 * }
 * ```
 */
export function useApiKeys() {
    const { signedInUser } = useContext(AuthenticationContext);
    const location = useLocation();

    // State
    const [data, setData] = useState<HalObject | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [apiKeysEndpoint, setApiKeysEndpoint] = useState<string | null>(null);
    const [pagingInstructions, setPagingInstructions] = useState<any>(null);
    const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);

    // Pagination history for backward navigation
    const [historyStack, setHistoryStack] = useState<any[]>([]);
    const [currentInstruction, setCurrentInstruction] = useState<any | null>(null);

    // Pagination state with localStorage persistence
    const [pageSize, setPageSize] = useState<PageSize>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = parseInt(saved, 10) as PageSize;
            if (PAGE_SIZE_OPTIONS.includes(parsed)) {
                return parsed;
            }
        }
        return DEFAULT_PAGE_SIZE;
    });

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
     * Fetch API keys HAL resource from API using POST with paging instruction
     */
    const fetchApiKeys = useCallback(
        async (pagingInstruction?: any) => {
            if (!apiKeysEndpoint) return;

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

                const response = await apiClient.post(apiKeysEndpoint, body);

                // Store full HAL object
                setData(response as HalObject);
                setPagingInstructions(response.paging);

                // Clear selection when data changes
                setSelectedIds(new Set());
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load API keys');
                setData(null);
            } finally {
                setLoading(false);
            }
        },
        [apiKeysEndpoint, pageSize]
    );

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
            fetchApiKeys(pagingInstructions.next);
        }
    }, [pagingInstructions, currentInstruction, fetchApiKeys]);

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
            fetchApiKeys(previousInstruction);
        } else if (currentInstruction) {
            // Go back to page 1 (no instruction)
            setCurrentInstruction(null);
            fetchApiKeys({ limit: pageSize });
        }
    }, [historyStack, currentInstruction, pageSize, fetchApiKeys]);

    /**
     * Handle page size change
     * Resets pagination, clears history, and persists preference to localStorage
     */
    const handlePageSizeChange = useCallback((newSize: PageSize) => {
        setPageSize(newSize);
        setSelectedIds(new Set());
        setHistoryStack([]);  // Clear history
        setCurrentInstruction(null);  // Reset to page 1
        localStorage.setItem(STORAGE_KEY, newSize.toString());
        // Refetch with new page size from page 1
        fetchApiKeys({ limit: newSize });
    }, [fetchApiKeys]);

    /**
     * Handle individual API key selection
     */
    const handleSelectionChange = useCallback((apiKeyId: string, selected: boolean) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (selected) {
                next.add(apiKeyId);
            } else {
                next.delete(apiKeyId);
            }
            return next;
        });
    }, []);

    /**
     * Get API keys array from HAL response
     */
    const apiKeys = useMemo(() => {
        return data?._embedded?.apiKeys || [];
    }, [data]);

    /**
     * Handle select all checkbox
     */
    const handleSelectAll = useCallback(
        (checked: boolean) => {
            if (checked) {
                setSelectedIds(new Set(apiKeys.map((key: any) => key.apiKeyId)));
            } else {
                setSelectedIds(new Set());
            }
        },
        [apiKeys]
    );

    /**
     * Refresh API keys list
     */
    const refresh = useCallback(() => {
        if (pagingInstructions?.current) {
            fetchApiKeys(pagingInstructions.current);
        } else {
            fetchApiKeys();
        }
    }, [fetchApiKeys, pagingInstructions]);

    // Discover endpoint on mount
    useEffect(() => {
        discoverEndpoint();
    }, [discoverEndpoint]);

    // Fetch initial data when endpoint is discovered
    useEffect(() => {
        if (apiKeysEndpoint && !hasInitiallyLoaded) {
            setHasInitiallyLoaded(true);

            // Clear any navigation state to prevent using stale pagination data
            if (location.state?.data) {
                window.history.replaceState({}, document.title);
            }

            // Always fetch with our pageSize state, ignore navigation data
            fetchApiKeys();
        }
    }, [apiKeysEndpoint, hasInitiallyLoaded, location.state, fetchApiKeys]);

    const pagination = {
        hasNext: !!pagingInstructions?.next,
        hasPrevious: historyStack.length > 0 || !!currentInstruction,  // Can go back if history exists or on page 2+
        pageSize,
    };

    return {
        data,
        apiKeys,
        loading,
        error,
        selectedIds,
        pagination,
        handleSelectionChange,
        handleSelectAll,
        handleNextPage,
        handlePreviousPage,
        handlePageSizeChange,
        refresh,
    };
}
