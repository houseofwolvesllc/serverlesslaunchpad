import { getConfig } from '../config/environment';

export interface ApiResponse<T = any> {
  data: T;
  _links?: Record<string, { href: string; method?: string }>;
  _embedded?: Record<string, any>;
}

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
  private config = getConfig();
  private baseURL: string;

  constructor() {
    this.baseURL = this.config.apiBaseUrl;
  }

  async request<T = any>(
    path: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${path}`;
    
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // Add x-forwarded-for header for local development (typically set by load balancer)
    if (this.config.features.debugMode) {
      defaultHeaders['X-Forwarded-For'] = '127.0.0.1';
    }

    // Add authentication token if available and not already set
    const token = this.getAuthToken();
    if (token) {
      // Check if Authorization header is already present in various header formats
      let hasAuthHeader = false;
      
      if (options.headers) {
        if (options.headers instanceof Headers) {
          hasAuthHeader = options.headers.has('Authorization') || options.headers.has('authorization');
        } else if (Array.isArray(options.headers)) {
          hasAuthHeader = options.headers.some(([key]) => 
            key.toLowerCase() === 'authorization'
          );
        } else {
          // Record<string, string> format
          const headerRecord = options.headers as Record<string, string>;
          hasAuthHeader = 'Authorization' in headerRecord || 'authorization' in headerRecord;
        }
      }
      
      if (!hasAuthHeader) {
        defaultHeaders.Authorization = token;
      }
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
    const timeoutId = setTimeout(() => controller.abort(), this.config.api.timeout);
    requestOptions.signal = controller.signal;

    try {
      if (this.config.features.debugMode) {
        console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`, {
          headers: requestOptions.headers,
          body: options.body
        });
      }

      const response = await fetch(url, requestOptions);
      clearTimeout(timeoutId);

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      const data = await response.json();

      if (this.config.features.debugMode) {
        console.log(`✅ API Response: ${response.status}`, data);
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof ApiClientError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiClientError(
          408,
          {
            code: 'REQUEST_TIMEOUT',
            message: 'Request timed out'
          }
        );
      }

      throw new ApiClientError(
        0,
        {
          code: 'NETWORK_ERROR',
          message: 'Network error occurred'
        }
      );
    }
  }

  private async handleErrorResponse(response: Response): Promise<never> {
    let error: ApiError;
    
    try {
      const errorData = await response.json();
      error = errorData.error || {
        code: 'UNKNOWN_ERROR',
        message: errorData.message || 'An error occurred'
      };
    } catch {
      error = {
        code: 'PARSE_ERROR',
        message: `HTTP ${response.status}: ${response.statusText}`
      };
    }

    if (this.config.features.debugMode) {
      console.error(`❌ API Error: ${response.status}`, error);
    }

    throw new ApiClientError(response.status, error, response);
  }

  private getAuthToken(): string | null {
    // Session authentication is now handled via secure cookies
    // The browser automatically sends session cookies with credentials: 'include'
    // Only return explicit authorization tokens for specific API calls
    return null;
  }

  // Convenience methods
  async get<T = any>(path: string, params?: Record<string, string>): Promise<ApiResponse<T>> {
    const url = new URL(path, this.baseURL);
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
    return response.data;
  }
}

// Singleton instance
export const apiClient = new ApiClient();