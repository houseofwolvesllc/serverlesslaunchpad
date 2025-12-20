import { useState, useEffect, useCallback, useContext } from 'react';
import { apiClient } from '../../../services/api.client';
import { getEntryPoint } from '../../../services/entry_point_provider';
import { AuthenticationContext } from '../../authentication/context/authentication_context';
import { ApiKey, ApiKeysResponse, PageSize, UseApiKeysResult } from '../types';

const STORAGE_KEY = 'api_keys_page_size';

/**
 * Custom hook for managing API keys with cursor-based pagination
 *
 * Provides functionality to:
 * - Fetch API keys from the hypermedia API with server-side pagination
 * - Select and bulk delete API keys
 * - Persist pagination preferences to localStorage
 * - Handle loading and error states
 * - Track expiration status
 *
 * The hook discovers the API keys endpoint via hypermedia navigation:
 * Entry Point → API Keys Link
 *
 * Uses POST-based cursor pagination matching the Sessions pattern.
 *
 * @returns {UseApiKeysResult} API keys data and operation functions
 *
 * @example
 * ```tsx
 * function ApiKeysPage() {
 *   const {
 *     apiKeys,
 *     loading,
 *     error,
 *     selectedIds,
 *     pagination,
 *     handleSelectionChange,
 *     handleSelectAll,
 *     handleNextPage,
 *     handlePreviousPage,
 *     handlePageSizeChange,
 *     deleteApiKeys,
 *     refresh,
 *   } = useApiKeys();
 *
 *   if (loading) return <ApiKeysTableSkeleton />;
 *   if (error) return <Alert color="red">{error}</Alert>;
 *
 *   return (
 *     <Table>
 *       {apiKeys.map(apiKey => (
 *         <ApiKeyRow
 *           key={apiKey.apiKeyId}
 *           apiKey={apiKey}
 *           selected={selectedIds.has(apiKey.apiKeyId)}
 *           onSelectionChange={handleSelectionChange}
 *         />
 *       ))}
 *     </Table>
 *   );
 * }
 * ```
 */
export function useApiKeys(): UseApiKeysResult {
    const { signedInUser } = useContext(AuthenticationContext);

    // State
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
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
            // Get api-keys link directly from root
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
     * Fetch API keys from API using POST with paging instruction
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

            const response = (await apiClient.post(apiKeysEndpoint, body)) as ApiKeysResponse;

            setApiKeys(response._embedded.apiKeys);
            setPagingInstructions(response.paging);

            // Clear selection when data changes
            setSelectedIds(new Set());
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load API keys');
            setApiKeys([]);
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
        // Will trigger re-fetch via useEffect
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
     * Handle select all checkbox
     */
    const handleSelectAll = useCallback(
        (checked: boolean) => {
            if (checked) {
                setSelectedIds(new Set(apiKeys.map((key) => key.apiKeyId)));
            } else {
                setSelectedIds(new Set());
            }
        },
        [apiKeys]
    );

    /**
     * Delete selected API keys
     * Refreshes the current page after deletion
     */
    const deleteApiKeys = useCallback(
        async (apiKeyIds: string[]): Promise<{ success: boolean; error?: string }> => {
            if (!apiKeysEndpoint) {
                return { success: false, error: 'API keys endpoint not available' };
            }

            try {
                // Construct delete endpoint (replace /list with /delete)
                // Note: Ideally this should be discovered from HAL links
                const deleteEndpoint = apiKeysEndpoint.replace('/list', '/delete');

                await apiClient.post(deleteEndpoint, { apiKeyIds });

                // Clear selection
                setSelectedIds(new Set());

                // Refresh current page using current paging instruction
                if (pagingInstructions?.current) {
                    await fetchApiKeys(pagingInstructions.current);
                } else {
                    // If no current instruction, do initial load
                    await fetchApiKeys();
                }

                return { success: true };
            } catch (err) {
                return {
                    success: false,
                    error: err instanceof Error ? err.message : 'Failed to delete API keys',
                };
            }
        },
        [apiKeysEndpoint, pagingInstructions, fetchApiKeys]
    );

    /**
     * Create a new API key
     * Returns the full API key data including the secret (shown only once)
     */
    const createApiKey = useCallback(
        async (
            label: string
        ): Promise<{
            success: boolean;
            data?: {
                apiKeyId: string;
                apiKey: string;
                label: string;
                dateCreated: string;
            };
            error?: string;
        }> => {
            if (!apiKeysEndpoint) {
                return { success: false, error: 'API keys endpoint not available' };
            }

            try {
                // Construct create endpoint (replace /list with /create)
                // Note: Ideally this should be discovered from HAL links
                const createEndpoint = apiKeysEndpoint.replace('/list', '/create');

                const body = { label };

                // Make request - response includes full API key
                const response = await apiClient.post(createEndpoint, body);

                // Refresh list to show new key (with prefix only)
                await fetchApiKeys();

                // Return full API key from response (one-time display)
                return {
                    success: true,
                    data: {
                        apiKeyId: response.apiKeyId,
                        apiKey: response.apiKey, // Full key from server
                        label: response.label,
                        dateCreated: response.dateCreated,
                    },
                };
            } catch (err) {
                return {
                    success: false,
                    error: err instanceof Error ? err.message : 'Failed to create API key',
                };
            }
        },
        [apiKeysEndpoint, fetchApiKeys]
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
        createApiKey,
        deleteApiKeys,
        refresh,
    };
}
