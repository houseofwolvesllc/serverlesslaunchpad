import type { HalObject, HalTemplate, HalTemplateProperty } from '@houseofwolves/serverlesslaunchpad.types/hal';
import { apiClient } from '$lib/services/api_client';

/**
 * Validation error for template data
 */
export interface ValidationError {
    field: string;
    message: string;
}

/**
 * HAL-FORMS client for interacting with hypermedia API templates
 *
 * Provides methods to:
 * - Fetch HAL resources with proper headers
 * - Execute template operations (POST/PUT/DELETE)
 * - Validate template data client-side
 *
 * @example
 * ```typescript
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
    /**
     * Fetch a HAL resource from the API
     *
     * @param url - The URL to fetch
     * @returns Promise<HalObject> The HAL resource
     * @throws {ApiClientError} If the request fails
     */
    async fetch(url: string): Promise<HalObject> {
        return await apiClient.request<HalObject>(url, {
            method: 'GET',
            headers: {
                Accept: 'application/hal+json',
            },
        });
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

        return await apiClient.request<HalObject>(target, {
            method: httpMethod,
            headers,
            body,
        });
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
 * Singleton instance of HalFormsClient
 */
export const halClient = new HalFormsClient();
