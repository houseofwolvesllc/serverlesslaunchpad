/**
 * API Key resource from API (HAL format)
 */
export interface ApiKey {
    apiKeyId: string;
    apiKey: string; // Full API key
    keyPrefix: string; // First 8 chars for reference
    label?: string;
    dateCreated: string; // ISO 8601
    dateLastUsed?: string; // ISO 8601
    _links?: {
        self: { href: string };
        delete?: { href: string; method: string };
    };
}

import type { PageSize } from '../../constants/pagination';

/**
 * Pagination state for cursor-based pagination
 */
export interface PaginationState {
    hasNext: boolean;
    hasPrevious: boolean;
    pageSize: number;
}

/**
 * Page size type
 * Re-export from shared pagination constants
 */
export type { PageSize };

/**
 * API response for API keys list (HAL format with cursor pagination)
 */
export interface ApiKeysResponse {
    _embedded: {
        apiKeys: ApiKey[];
    };
    _links: {
        self: { href: string };
    };
    paging: {
        next?: any;
        previous?: any;
        current?: any;
        limit: number;
    };
    count: number;
}

/**
 * Expiration status
 */
export interface ExpirationInfo {
    isExpiring: boolean; // Within 30 days
    isExpired: boolean;
    daysUntilExpiration: number | null;
    label: string; // Display text
}

/**
 * Hook return type
 */
export interface UseApiKeysResult {
    apiKeys: ApiKey[];
    loading: boolean;
    error: string | null;
    selectedIds: Set<string>;
    pagination: PaginationState;
    handleSelectionChange: (apiKeyId: string, selected: boolean) => void;
    handleSelectAll: (checked: boolean) => void;
    handleNextPage: () => void;
    handlePreviousPage: () => void;
    handlePageSizeChange: (newSize: PageSize) => void;
    createApiKey: (label: string) => Promise<{
        success: boolean;
        data?: {
            apiKeyId: string;
            apiKey: string;
            label: string;
            dateCreated: string;
        };
        error?: string;
    }>;
    deleteApiKeys: (apiKeyIds: string[]) => Promise<{ success: boolean; error?: string }>;
    refresh: () => void;
}
