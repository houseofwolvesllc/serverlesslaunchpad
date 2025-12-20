/**
 * API Client for HAL (Hypertext Application Language) APIs
 *
 * Framework-agnostic HTTP client for interacting with HAL-compliant APIs.
 * Supports hypermedia controls (_links, _embedded, _templates).
 *
 * @see https://datatracker.ietf.org/doc/html/draft-kelly-json-hal-11
 */

/**
 * HAL (Hypertext Application Language) response structure
 * The response data properties are at the root level, not nested under 'data'
 *
 * @see https://datatracker.ietf.org/doc/html/draft-kelly-json-hal-11
 */
export type ApiResponse<T = Record<string, any>> = T & {
    /** HAL hypermedia links */
    _links?: Record<string, { href: string; title?: string; templated?: boolean }>;

    /** HAL embedded resources */
    _embedded?: Record<string, any>;

    /** HAL action templates (HAL-FORMS) */
    _templates?: Record<string, any>;
};

/**
 * API error structure
 */
export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, any>;
}

/**
 * API Client error with HTTP status and structured error
 */
export class ApiClientError extends Error {
    constructor(
        public status: number,
        public error: ApiError,
        public response?: Response
    ) {
        super(error.message);
        this.name = 'ApiClientError';
    }
}

/**
 * Configuration for the API client
 */
export interface ApiClientConfig {
    /** Base URL for the API (e.g., 'https://api.example.com') */
    baseUrl: string;

    /** Request timeout in milliseconds (default: 30000) */
    timeout?: number;

    /** Default headers to include with every request */
    defaultHeaders?: Record<string, string>;

    /** Whether to include credentials (cookies) with requests (default: true) */
    credentials?: boolean;

    /** Environment mode - if 'development', adds X-Forwarded-For header (default: 'production') */
    mode?: 'development' | 'production';

    /** Optional logger function for debugging */
    logger?: {
        debug: (message: string, context?: any) => void;
        error: (message: string, context?: any) => void;
    };
}

/**
 * Pure TypeScript HAL API Client
 *
 * Framework-agnostic client for HAL-compliant APIs. Can be used directly
 * in any JavaScript/TypeScript environment (React, Svelte, Node.js, etc.).
 *
 * @example
 * ```typescript
 * const client = new ApiClient({
 *   baseUrl: 'https://api.example.com',
 *   timeout: 30000,
 *   mode: 'development'
 * });
 *
 * const users = await client.get('/users');
 * const newUser = await client.post('/users', { name: 'Alice' });
 * ```
 */
export class ApiClient {
    private config: Required<ApiClientConfig>;

    constructor(config: ApiClientConfig) {
        this.config = {
            baseUrl: config.baseUrl,
            timeout: config.timeout || 30000,
            defaultHeaders: config.defaultHeaders || {},
            credentials: config.credentials !== false, // Default to true
            mode: config.mode || 'production',
            logger: config.logger || {
                debug: () => {}, // No-op logger by default
                error: () => {},
            },
        };
    }

    /**
     * Make an HTTP request to the API
     *
     * @param path - API path (e.g., '/users/123')
     * @param options - Fetch request options
     * @returns Promise resolving to HAL response
     */
    async request<T = any>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
        const url = `${this.config.baseUrl}${path}`;

        const defaultHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...this.config.defaultHeaders,
        };

        // Add x-forwarded-for header for local development (typically set by load balancer)
        if (this.config.mode === 'development') {
            defaultHeaders['X-Forwarded-For'] = '127.0.0.1';
        }

        const requestOptions: RequestInit = {
            ...options,
            credentials: this.config.credentials ? 'include' : 'omit',
            headers: {
                ...defaultHeaders,
                ...options.headers,
            },
        };

        // Add timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
        requestOptions.signal = controller.signal;

        try {
            this.config.logger.debug('API Request', {
                method: options.method || 'GET',
                url,
                headers: requestOptions.headers,
                body: options.body,
            });

            const response = await fetch(url, requestOptions);
            clearTimeout(timeoutId);

            if (!response.ok) {
                await this.handleErrorResponse(response);
            }

            const data = await response.json();

            this.config.logger.debug('API Response', {
                status: response.status,
                data,
            });

            // HAL responses are returned directly with _links and _embedded at root
            // Return as-is for HAL compatibility (response IS the data + hypermedia controls)
            return data;
        } catch (error) {
            clearTimeout(timeoutId);

            if (error instanceof ApiClientError) {
                throw error;
            }

            if (error instanceof Error && error.name === 'AbortError') {
                throw new ApiClientError(408, {
                    code: 'REQUEST_TIMEOUT',
                    message: 'Request timed out',
                });
            }

            throw new ApiClientError(0, {
                code: 'NETWORK_ERROR',
                message: 'Network error occurred',
            });
        }
    }

    /**
     * Handle HTTP error responses
     */
    private async handleErrorResponse(response: Response): Promise<never> {
        let error: ApiError;

        try {
            const errorData = await response.json();
            error = errorData.error || {
                code: 'UNKNOWN_ERROR',
                message: errorData.message || 'An error occurred',
            };
        } catch {
            error = {
                code: 'PARSE_ERROR',
                message: `HTTP ${response.status}: ${response.statusText}`,
            };
        }

        this.config.logger.error('API Error', {
            status: response.status,
            error,
        });

        throw new ApiClientError(response.status, error, response);
    }

    /**
     * Convenience method for GET requests
     */
    async get<T = any>(path: string, params?: Record<string, string>): Promise<ApiResponse<T>> {
        const url = new URL(path, this.config.baseUrl);
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                url.searchParams.append(key, value);
            });
        }
        return this.request<T>(url.pathname + url.search);
    }

    /**
     * Convenience method for POST requests
     */
    async post<T = any>(path: string, data?: any): Promise<ApiResponse<T>> {
        return this.request<T>(path, {
            method: 'POST',
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    /**
     * Convenience method for PUT requests
     */
    async put<T = any>(path: string, data?: any): Promise<ApiResponse<T>> {
        return this.request<T>(path, {
            method: 'PUT',
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    /**
     * Convenience method for PATCH requests
     */
    async patch<T = any>(path: string, data?: any): Promise<ApiResponse<T>> {
        return this.request<T>(path, {
            method: 'PATCH',
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    /**
     * Convenience method for DELETE requests
     */
    async delete<T = any>(path: string): Promise<ApiResponse<T>> {
        return this.request<T>(path, {
            method: 'DELETE',
        });
    }

    /**
     * Health check method
     */
    async health(): Promise<{ status: string; timestamp: string }> {
        const response = await this.get<{ status: string; timestamp: string }>('/health');
        // HAL response: properties at root level
        return { status: response.status, timestamp: response.timestamp };
    }

    /**
     * Get current configuration
     */
    getConfig(): Readonly<Required<ApiClientConfig>> {
        return { ...this.config };
    }

    /**
     * Update base URL (useful for testing or multi-environment apps)
     */
    setBaseUrl(baseUrl: string): void {
        this.config.baseUrl = baseUrl;
    }

    /**
     * Update default headers (useful for authentication tokens)
     */
    setHeaders(headers: Record<string, string>): void {
        this.config.defaultHeaders = {
            ...this.config.defaultHeaders,
            ...headers,
        };
    }

    /**
     * Clear specific header
     */
    clearHeader(key: string): void {
        delete this.config.defaultHeaders[key];
    }
}

/**
 * Factory function to create an API client instance
 *
 * @param config - API client configuration
 * @returns New ApiClient instance
 */
export function createApiClient(config: ApiClientConfig): ApiClient {
    return new ApiClient(config);
}
