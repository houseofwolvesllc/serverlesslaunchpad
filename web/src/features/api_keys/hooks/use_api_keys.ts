import { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { apiClient } from '../../../services/api.client';
import { getEntryPoint } from '../../../services/entry_point_provider';
import { AuthenticationContext } from '../../authentication/context/authentication_context';
import { HalObject } from '../../../types/hal';
import { PageSize } from '../types';

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

    // State
    const [data, setData] = useState<HalObject | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [apiKeysEndpoint, setApiKeysEndpoint] = useState<string | null>(null);
    const [pagingInstructions, setPagingInstructions] = useState<any>(null);

    // Pagination state with localStorage persistence
    const [pageSize, setPageSize] = useState<PageSize>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = parseInt(saved, 10);
            if ([10, 25, 50, 100].includes(parsed)) {
                return parsed as PageSize;
            }
        }
        return 25;
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
            const apiKeysHref = await entryPoint.getLinkHref('api-keys');

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
    const fetchApiKeys = useCallback(async (pagingInstruction?: any) => {
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
    }, [apiKeysEndpoint, pageSize]);

    /**
     * Handle next page navigation
     */
    const handleNextPage = useCallback(() => {
        if (pagingInstructions?.next) {
            fetchApiKeys(pagingInstructions.next);
        }
    }, [pagingInstructions, fetchApiKeys]);

    /**
     * Handle previous page navigation
     */
    const handlePreviousPage = useCallback(() => {
        if (pagingInstructions?.previous) {
            fetchApiKeys(pagingInstructions.previous);
        }
    }, [pagingInstructions, fetchApiKeys]);

    /**
     * Handle page size change
     * Resets pagination and persists preference to localStorage
     */
    const handlePageSizeChange = useCallback((newSize: PageSize) => {
        setPageSize(newSize);
        setSelectedIds(new Set());
        localStorage.setItem(STORAGE_KEY, newSize.toString());
    }, []);

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

    // Fetch API keys when endpoint or page size changes
    useEffect(() => {
        if (apiKeysEndpoint) {
            fetchApiKeys();
        }
    }, [apiKeysEndpoint, pageSize]);

    const pagination = {
        hasNext: !!pagingInstructions?.next,
        hasPrevious: !!pagingInstructions?.previous,
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
