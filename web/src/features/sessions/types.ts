/**
 * Session resource from API (HAL format)
 */
export interface Session {
    sessionId: string;
    ipAddress: string;
    userAgent: string;
    dateCreated: string; // ISO 8601
    dateExpires: string; // ISO 8601
    dateLastAccessed?: string; // ISO 8601
    isCurrent?: boolean; // Computed client-side
    _links?: {
        self: { href: string };
        delete?: { href: string; method: string };
    };
}

/**
 * Cursor-based pagination state
 */
export interface PaginationState {
    hasNext: boolean;
    hasPrevious: boolean;
    pageSize: number; // Items per page
}

/**
 * Page size options
 */
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

/**
 * Paging instruction for cursor-based pagination
 */
export interface PagingInstruction {
    limit?: number;
    [key: string]: any; // Opaque cursor data from API
}

/**
 * Paging instructions from API response
 */
export interface PagingInstructions {
    previous?: PagingInstruction;
    current?: PagingInstruction;
    next?: PagingInstruction;
}

/**
 * API response for sessions list (HAL format with cursor pagination)
 */
export interface SessionsResponse {
    _embedded: {
        sessions: Session[];
    };
    _links: {
        self: { href: string };
        next?: { href: string };
        previous?: { href: string };
    };
    _templates?: {
        [key: string]: {
            title: string;
            method: string;
            target: string;
            properties?: any[];
        };
    };
    paging: PagingInstructions;
    count: number; // Items in current response
}

/**
 * Parsed device information from user agent
 */
export interface DeviceInfo {
    browser: string;
    os: string;
    device: string;
}

/**
 * Hook return type
 */
export interface UseSessionsResult {
    data: SessionsResponse | null; // Full HAL object with _templates
    sessions: Session[]; // Extracted array for convenience
    loading: boolean;
    error: string | null;
    selectedIds: Set<string>;
    currentSessionToken: string | null;
    pagination: PaginationState;
    handleSelectionChange: (sessionToken: string, selected: boolean) => void;
    handleSelectAll: (checked: boolean) => void;
    handleNextPage: () => void;
    handlePreviousPage: () => void;
    handlePageSizeChange: (newSize: PageSize) => void;
    refresh: () => void;
}
