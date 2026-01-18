/**
 * HAL-FORMS Client
 *
 * Framework-agnostic client for interacting with hypermedia API templates.
 * Provides methods to fetch HAL resources, execute templates, and validate data.
 *
 * @see https://rwcbook.github.io/hal-forms/
 */

import type { HalObject, HalTemplate, HalTemplateProperty } from '@houseofwolves/serverlesslaunchpad.types/hal';
import { ApiClient } from '../services/api_client';

/**
 * Validation error for template data
 */
export interface ValidationError {
    field: string;
    message: string;
}

/**
 * Configuration options for HalFormsClient
 */
export interface HalFormsClientOptions {
    /**
     * Callback invoked when a 401 Unauthorized error occurs.
     * Use this to handle session expiration (e.g., redirect to login).
     */
    onAuthError?: () => void;
}

/**
 * HAL-FORMS client for interacting with hypermedia API templates
 *
 * Pure TypeScript client that works with any framework (React, Svelte, Vue, etc.).
 * Requires an ApiClient instance to be passed in for making HTTP requests.
 *
 * @example
 * ```typescript
 * import { ApiClient, HalFormsClient } from '@houseofwolves/serverlesslaunchpad.web.commons';
 *
 * const apiClient = new ApiClient({ baseUrl: 'https://api.example.com' });
 * const halClient = new HalFormsClient(apiClient, {
 *   onAuthError: () => window.location.reload()
 * });
 *
 * // Fetch a HAL resource
 * const resource = await halClient.fetch('/users/123');
 *
 * // Get a template from the resource
 * const template = resource._templates?.['create'];
 *
 * // Validate data
 * const errors = halClient.validateTemplateData(template, { name: 'Test' });
 *
 * // Execute the template
 * if (errors.length === 0) {
 *   const result = await halClient.executeTemplate(template, { name: 'Test' });
 * }
 * ```
 */
export class HalFormsClient {
    private options: HalFormsClientOptions;

    constructor(private apiClient: ApiClient, options?: HalFormsClientOptions) {
        this.options = options || {};
    }

    /**
     * Handle errors, checking for 401 and invoking callback if configured
     * Returns true if error was handled (401 with callback), false otherwise
     */
    private handleError(error: any): boolean {
        if (error?.status === 401 && this.options.onAuthError) {
            this.options.onAuthError();
            return true;
        }
        return false;
    }

    /**
     * GET a HAL resource from the API
     *
     * @param url - The URL to fetch
     * @returns Promise<T> The HAL resource
     * @throws {ApiClientError} If the request fails (except 401 when onAuthError is configured)
     */
    async get<T extends HalObject = HalObject>(url: string): Promise<T> {
        try {
            return await this.apiClient.request<T>(url, {
                method: 'GET',
                headers: {
                    Accept: 'application/hal+json',
                },
            });
        } catch (error) {
            if (this.handleError(error)) {
                return new Promise<never>(() => {}); // Never resolves, prevents component updates
            }
            throw error;
        }
    }

    /**
     * POST to a HAL API endpoint
     *
     * @param url - The URL to post to
     * @param data - Optional data to send
     * @returns Promise<T> The HAL resource response
     * @throws {ApiClientError} If the request fails (except 401 when onAuthError is configured)
     */
    async post<T extends HalObject = HalObject>(url: string, data?: any): Promise<T> {
        try {
            return await this.apiClient.request<T>(url, {
                method: 'POST',
                headers: {
                    Accept: 'application/hal+json',
                    'Content-Type': 'application/json',
                },
                body: data ? JSON.stringify(data) : undefined,
            });
        } catch (error) {
            if (this.handleError(error)) {
                return new Promise<never>(() => {});
            }
            throw error;
        }
    }

    /**
     * PUT to a HAL API endpoint
     *
     * @param url - The URL to put to
     * @param data - Optional data to send
     * @returns Promise<T> The HAL resource response
     * @throws {ApiClientError} If the request fails (except 401 when onAuthError is configured)
     */
    async put<T extends HalObject = HalObject>(url: string, data?: any): Promise<T> {
        try {
            return await this.apiClient.request<T>(url, {
                method: 'PUT',
                headers: {
                    Accept: 'application/hal+json',
                    'Content-Type': 'application/json',
                },
                body: data ? JSON.stringify(data) : undefined,
            });
        } catch (error) {
            if (this.handleError(error)) {
                return new Promise<never>(() => {});
            }
            throw error;
        }
    }

    /**
     * PATCH a HAL API endpoint
     *
     * @param url - The URL to patch
     * @param data - Optional data to send
     * @returns Promise<T> The HAL resource response
     * @throws {ApiClientError} If the request fails (except 401 when onAuthError is configured)
     */
    async patch<T extends HalObject = HalObject>(url: string, data?: any): Promise<T> {
        try {
            return await this.apiClient.request<T>(url, {
                method: 'PATCH',
                headers: {
                    Accept: 'application/hal+json',
                    'Content-Type': 'application/json',
                },
                body: data ? JSON.stringify(data) : undefined,
            });
        } catch (error) {
            if (this.handleError(error)) {
                return new Promise<never>(() => {});
            }
            throw error;
        }
    }

    /**
     * DELETE a HAL API resource
     *
     * @param url - The URL to delete
     * @returns Promise<T> The HAL resource response
     * @throws {ApiClientError} If the request fails (except 401 when onAuthError is configured)
     */
    async delete<T extends HalObject = HalObject>(url: string): Promise<T> {
        try {
            return await this.apiClient.request<T>(url, {
                method: 'DELETE',
                headers: {
                    Accept: 'application/hal+json',
                },
            });
        } catch (error) {
            if (this.handleError(error)) {
                return new Promise<never>(() => {});
            }
            throw error;
        }
    }

    /**
     * Fetch a HAL resource from the API
     *
     * @param url - The URL to fetch
     * @param options - Optional request options (e.g., custom headers)
     * @returns Promise<HalObject> The HAL resource
     * @throws {ApiClientError} If the request fails (except 401 when onAuthError is configured)
     */
    async fetch(url: string, options?: { headers?: Record<string, string> }): Promise<HalObject> {
        try {
            return await this.apiClient.request<HalObject>(url, {
                method: 'GET',
                headers: {
                    Accept: 'application/hal+json',
                    ...options?.headers,
                },
            });
        } catch (error) {
            if (this.handleError(error)) {
                return new Promise<never>(() => {});
            }
            throw error;
        }
    }

    /**
     * Execute a HAL template operation
     *
     * Submits form data to the template target URL using the specified HTTP method.
     * Handles method overrides for DELETE/PUT via _method field.
     *
     * @param template - The HAL template to execute
     * @param data - The form data to submit
     * @returns Promise<HalObject> The result resource
     * @throws {ApiClientError} If the request fails
     */
    async executeTemplate(template: HalTemplate, data: Record<string, any>): Promise<HalObject> {
        const method = template.method.toUpperCase();
        const target = template.target;
        const contentType = template.contentType || 'application/json';

        // Prepare request body
        let body: string;
        const headers: Record<string, string> = {
            Accept: 'application/hal+json',
        };

        // Handle method override for DELETE/PUT using POST
        const requestData = { ...data };
        if (method === 'DELETE' || method === 'PUT') {
            requestData._method = method.toLowerCase();
        }

        // Format body based on content type
        if (contentType === 'application/json') {
            body = JSON.stringify(requestData);
            headers['Content-Type'] = 'application/json';
        } else if (contentType === 'application/x-www-form-urlencoded') {
            body = new URLSearchParams(requestData).toString();
            headers['Content-Type'] = 'application/x-www-form-urlencoded';
        } else {
            // Default to JSON
            body = JSON.stringify(requestData);
            headers['Content-Type'] = 'application/json';
        }

        // Use POST for DELETE/PUT method overrides, otherwise use the template method
        const httpMethod = method === 'DELETE' || method === 'PUT' ? 'POST' : method;

        try {
            return await this.apiClient.request<HalObject>(target, {
                method: httpMethod,
                headers,
                body,
            });
        } catch (error) {
            if (this.handleError(error)) {
                return new Promise<never>(() => {});
            }
            throw error;
        }
    }

    /**
     * Validate template data against template property constraints
     *
     * Performs client-side validation checking:
     * - Required fields
     * - Type constraints
     * - Min/max values (numbers)
     * - Min/max length (strings)
     * - Regex patterns
     *
     * @param template - The HAL template with property definitions
     * @param data - The form data to validate
     * @returns ValidationError[] Array of validation errors (empty if valid)
     */
    validateTemplateData(template: HalTemplate, data: Record<string, any>): ValidationError[] {
        const errors: ValidationError[] = [];

        if (!template.properties) {
            return errors;
        }

        for (const property of template.properties) {
            const value = data[property.name];
            const propertyErrors = this.validateProperty(property, value);
            errors.push(...propertyErrors);
        }

        return errors;
    }

    /**
     * Validate a single property value against its constraints
     *
     * @param property - The property definition
     * @param value - The value to validate
     * @returns ValidationError[] Array of validation errors for this property
     */
    private validateProperty(property: HalTemplateProperty, value: any): ValidationError[] {
        const errors: ValidationError[] = [];
        const fieldName = property.prompt || property.name;

        // Required field check
        if (property.required && (value === undefined || value === null || value === '')) {
            errors.push({
                field: property.name,
                message: `${fieldName} is required`,
            });
            // If required and missing, skip other validations
            return errors;
        }

        // Skip validation if value is not provided and field is optional
        if (value === undefined || value === null || value === '') {
            return errors;
        }

        // Type-specific validations
        const type = property.type || 'text';

        if (type === 'number') {
            const numValue = typeof value === 'number' ? value : parseFloat(value);

            if (isNaN(numValue)) {
                errors.push({
                    field: property.name,
                    message: `${fieldName} must be a number`,
                });
                return errors;
            }

            // Min/max constraints for numbers
            if (property.min !== undefined) {
                const minValue = typeof property.min === 'number' ? property.min : parseFloat(property.min);
                if (numValue < minValue) {
                    errors.push({
                        field: property.name,
                        message: `${fieldName} must be at least ${property.min}`,
                    });
                }
            }

            if (property.max !== undefined) {
                const maxValue = typeof property.max === 'number' ? property.max : parseFloat(property.max);
                if (numValue > maxValue) {
                    errors.push({
                        field: property.name,
                        message: `${fieldName} must be at most ${property.max}`,
                    });
                }
            }
        }

        if (type === 'email') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(String(value))) {
                errors.push({
                    field: property.name,
                    message: `${fieldName} must be a valid email address`,
                });
            }
        }

        if (type === 'url') {
            try {
                new URL(String(value));
            } catch {
                errors.push({
                    field: property.name,
                    message: `${fieldName} must be a valid URL`,
                });
            }
        }

        // String length constraints
        if (typeof value === 'string') {
            if (property.minLength !== undefined && value.length < property.minLength) {
                errors.push({
                    field: property.name,
                    message: `${fieldName} must be at least ${property.minLength} characters`,
                });
            }

            if (property.maxLength !== undefined && value.length > property.maxLength) {
                errors.push({
                    field: property.name,
                    message: `${fieldName} must be at most ${property.maxLength} characters`,
                });
            }
        }

        // Regex pattern validation
        if (property.regex && typeof value === 'string') {
            const regex = new RegExp(property.regex);
            if (!regex.test(value)) {
                errors.push({
                    field: property.name,
                    message: `${fieldName} has an invalid format`,
                });
            }
        }

        return errors;
    }
}

/**
 * Factory function to create a HAL-FORMS client instance
 *
 * @param apiClient - ApiClient instance to use for HTTP requests
 * @param options - Optional configuration (e.g., onAuthError callback)
 * @returns New HalFormsClient instance
 */
export function createHalFormsClient(apiClient: ApiClient, options?: HalFormsClientOptions): HalFormsClient {
    return new HalFormsClient(apiClient, options);
}
