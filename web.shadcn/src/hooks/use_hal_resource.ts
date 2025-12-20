import { useState, useEffect, useCallback } from 'react';
import { HalObject, HalTemplate } from '@houseofwolves/serverlesslaunchpad.types/hal';
import { halClient, ValidationError } from '../lib/hal_forms_client';

/**
 * Result type for useHalResource hook
 */
export interface UseHalResourceResult {
    /** The fetched HAL resource */
    data: HalObject | null;
    /** Loading state */
    loading: boolean;
    /** Error message if fetch failed */
    error: string | null;
    /** Refetch the resource */
    refetch: () => Promise<void>;
}

/**
 * Result type for useExecuteTemplate hook
 */
export interface UseExecuteTemplateResult {
    /** Execute a template with form data */
    execute: (template: HalTemplate, data: Record<string, any>) => Promise<HalObject>;
    /** Loading state during execution */
    loading: boolean;
    /** Error message if execution failed */
    error: string | null;
    /** Validation errors from last validation */
    validationErrors: ValidationError[];
    /** The result of the last successful execution */
    result: HalObject | null;
    /** Reset the execution state */
    reset: () => void;
}

/**
 * Custom hook for fetching HAL resources
 *
 * Fetches a HAL resource from the API and handles loading/error states.
 * The resource is fetched on mount and can be refetched manually.
 *
 * Supports both GET (links) and POST (templates):
 * - If template is provided, executes template with default values
 * - Otherwise, performs GET request
 *
 * @param url - The URL to fetch (or null to skip fetching)
 * @param template - Optional HAL template to execute (POST) instead of GET
 * @returns UseHalResourceResult with data, loading, error, and refetch function
 *
 * @example
 * ```tsx
 * // GET request (link)
 * function ResourceView({ url }) {
 *   const { data, loading, error, refetch } = useHalResource(url);
 *   // ...
 * }
 *
 * // POST request (template)
 * function CollectionView({ url, template }) {
 *   const { data, loading, error, refetch } = useHalResource(url, template);
 *   // ...
 * }
 * ```
 */
export function useHalResource(url: string | null, template?: HalTemplate): UseHalResourceResult {
    const [data, setData] = useState<HalObject | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Fetch resource - uses ETags automatically (handled by ApiClient)
     * URL is the single source of truth - always fetch from URL
     *
     * If template is provided, executes it (POST) with default values.
     * Otherwise, performs GET request.
     */
    const fetchResource = useCallback(async () => {
        if (!url) {
            setData(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            let resource: HalObject;

            if (template) {
                // Execute template (POST) with default/hidden field values
                // Extract default values from template properties
                const defaultData: Record<string, any> = {};

                if (template.properties) {
                    for (const prop of template.properties) {
                        if (prop.value !== undefined) {
                            defaultData[prop.name] = prop.value;
                        }
                    }
                }

                resource = await halClient.executeTemplate(template, defaultData);
            } else {
                // Fetch via GET
                // ApiClient automatically handles ETags:
                // - Sends If-None-Match if ETag exists
                // - Handles 304 Not Modified responses (fast, ~10ms)
                // - Stores new ETags for future requests
                resource = await halClient.fetch(url);
            }

            setData(resource);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch resource');
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [url, template]);

    useEffect(() => {
        fetchResource();
    }, [fetchResource]);

    /**
     * Refetch resource - bypasses cache
     * Used after mutations or manual refresh to ensure fresh data
     */
    const refetch = useCallback(async () => {
        if (!url) return;

        setLoading(true);
        setError(null);

        try {
            let resource: HalObject;

            if (template) {
                // Re-execute template with default values
                const defaultData: Record<string, any> = {};

                if (template.properties) {
                    for (const prop of template.properties) {
                        if (prop.value !== undefined) {
                            defaultData[prop.name] = prop.value;
                        }
                    }
                }

                resource = await halClient.executeTemplate(template, defaultData);
            } else {
                // Bypass all caches (client, server, CDN)
                resource = await halClient.fetch(url, {
                    headers: {
                        'Cache-Control': 'no-cache',
                    },
                });
            }

            setData(resource);
        } catch (err: any) {
            setError(err.message || 'Failed to refetch resource');
        } finally {
            setLoading(false);
        }
    }, [url, template]);

    return {
        data,
        loading,
        error,
        refetch,
    };
}

/**
 * Custom hook for executing HAL templates
 *
 * Provides functionality to execute template operations with validation.
 * Handles loading/error states and validation errors.
 *
 * @param onSuccess - Optional callback called after successful execution
 * @returns UseExecuteTemplateResult with execute function and state
 *
 * @example
 * ```tsx
 * function CreateForm({ template }) {
 *   const { execute, loading, error, validationErrors } = useExecuteTemplate((result) => {
 *     console.log('Created:', result);
 *     navigate('/items');
 *   });
 *
 *   const handleSubmit = async (formData) => {
 *     try {
 *       await execute(template, formData);
 *     } catch (err) {
 *       // Error is already set in state
 *     }
 *   };
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       {validationErrors.map(err => (
 *         <div key={err.field}>{err.message}</div>
 *       ))}
 *       <Button type="submit" loading={loading}>Submit</Button>
 *     </form>
 *   );
 * }
 * ```
 */
export function useExecuteTemplate(
    onSuccess?: (result: HalObject) => void
): UseExecuteTemplateResult {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
    const [result, setResult] = useState<HalObject | null>(null);

    const execute = useCallback(
        async (template: HalTemplate, data: Record<string, any>): Promise<HalObject> => {
            setLoading(true);
            setError(null);
            setValidationErrors([]);
            setResult(null);

            try {
                // Execute template (server handles validation)
                const executionResult = await halClient.executeTemplate(template, data);
                setResult(executionResult);

                // Call success callback
                if (onSuccess) {
                    onSuccess(executionResult);
                }

                return executionResult;
            } catch (err: any) {
                const errorMessage = err.message || 'Failed to execute template';
                setError(errorMessage);
                throw err;
            } finally {
                setLoading(false);
            }
        },
        [onSuccess]
    );

    const reset = useCallback(() => {
        setLoading(false);
        setError(null);
        setValidationErrors([]);
        setResult(null);
    }, []);

    return {
        execute,
        loading,
        error,
        validationErrors,
        result,
        reset,
    };
}
