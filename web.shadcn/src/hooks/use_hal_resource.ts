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
 * @param url - The URL to fetch (or null to skip fetching)
 * @returns UseHalResourceResult with data, loading, error, and refetch function
 *
 * @example
 * ```tsx
 * function ResourceView({ url }) {
 *   const { data, loading, error, refetch } = useHalResource(url);
 *
 *   if (loading) return <Loader />;
 *   if (error) return <Alert color="red">{error}</Alert>;
 *
 *   return (
 *     <div>
 *       <pre>{JSON.stringify(data, null, 2)}</pre>
 *       <Button onClick={refetch}>Refresh</Button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useHalResource(url: string | null): UseHalResourceResult {
    const [data, setData] = useState<HalObject | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Fetch resource - uses ETags automatically (handled by ApiClient)
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
            // ApiClient automatically handles ETags:
            // - Sends If-None-Match if ETag exists
            // - Handles 304 Not Modified responses
            // - Stores new ETags for future requests
            const resource = await halClient.fetch(url);
            setData(resource);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch resource');
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [url]);

    useEffect(() => {
        fetchResource();
    }, [fetchResource]);

    /**
     * Refetch resource - bypasses cache with Cache-Control: no-cache
     * Used after mutations to ensure fresh data
     */
    const refetch = useCallback(async () => {
        if (!url) return;

        setLoading(true);
        setError(null);

        try {
            // Bypass all caches (client, server, CDN) to get fresh data
            const resource = await halClient.fetch(url, {
                headers: {
                    'Cache-Control': 'no-cache',
                },
            });
            setData(resource);
        } catch (err: any) {
            setError(err.message || 'Failed to refetch resource');
        } finally {
            setLoading(false);
        }
    }, [url]);

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
