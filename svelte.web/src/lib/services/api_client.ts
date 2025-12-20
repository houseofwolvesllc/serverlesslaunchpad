import WebConfigurationStore from '../config/web_config_store';
import { logger } from '../logging/logger';

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

export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, any>;
}

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

export class ApiClient {
    private config: Promise<any> | null = null;

    constructor() {
        // No initialization needed - config is lazy loaded on first request
    }

    /**
     * Lazy loads and caches configuration.
     * On first call, stores the config promise. Concurrent calls await the same promise.
     * After resolution, the promise is cached and returns the value immediately on subsequent awaits.
     * @returns The loaded configuration object
     */
    private async getConfig() {
        if (!this.config) {
            this.config = WebConfigurationStore.getConfig();
        }
        return await this.config;
    }

    async request<T = any>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
        // Lazy load config - will be cached after first call
        const config = await this.getConfig();
        const url = `${config.api.base_url}${path}`;

        const defaultHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
            Accept: 'application/json',
        };

        // Add x-forwarded-for header for local development (typically set by load balancer)
        // Always set in development mode (determined by Vite MODE)
        if (import.meta.env.MODE === 'development') {
            defaultHeaders['X-Forwarded-For'] = '127.0.0.1';
        }

        const requestOptions: RequestInit = {
            ...options,
            credentials: 'include', // Include cookies for session management
            headers: {
                ...defaultHeaders,
                ...options.headers,
            },
        };

        // Add timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config?.api?.timeout || 30000);
        requestOptions.signal = controller.signal;

        try {
            logger.debug('API Request', {
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

            logger.debug('API Response', {
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

        logger.error('API Error', {
            status: response.status,
            error,
        });

        throw new ApiClientError(response.status, error, response);
    }

    // Convenience methods
    async get<T = any>(path: string, params?: Record<string, string>): Promise<ApiResponse<T>> {
        // Lazy load config for baseURL
        const config = await this.getConfig();
        const url = new URL(path, config.api.base_url);
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                url.searchParams.append(key, value);
            });
        }
        return this.request<T>(url.pathname + url.search);
    }

    async post<T = any>(path: string, data?: any): Promise<ApiResponse<T>> {
        return this.request<T>(path, {
            method: 'POST',
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    async put<T = any>(path: string, data?: any): Promise<ApiResponse<T>> {
        return this.request<T>(path, {
            method: 'PUT',
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    async patch<T = any>(path: string, data?: any): Promise<ApiResponse<T>> {
        return this.request<T>(path, {
            method: 'PATCH',
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    async delete<T = any>(path: string): Promise<ApiResponse<T>> {
        return this.request<T>(path, {
            method: 'DELETE',
        });
    }

    // Health check method
    async health(): Promise<{ status: string; timestamp: string }> {
        const response = await this.get<{ status: string; timestamp: string }>('/health');
        // HAL response: properties at root level
        return { status: response.status, timestamp: response.timestamp };
    }
}

// Singleton instance
export const apiClient = new ApiClient();
