import { useState, FormEvent, ReactNode } from 'react';

export interface UseFormConfig<T extends Record<string, any>> {
    initialValues: T;
    validate?: Partial<Record<keyof T, (value: any, values: T) => string | null | ReactNode>>;
}

export interface UseFormReturn<T extends Record<string, any>> {
    values: T;
    errors: Partial<Record<keyof T, string | ReactNode>>;
    setFieldValue: <K extends keyof T>(field: K, value: T[K]) => void;
    setFieldError: <K extends keyof T>(field: K, error: string | ReactNode) => void;
    onSubmit: (callback: (values: T) => void | Promise<void>) => (event: FormEvent<HTMLFormElement>) => void;
    getInputProps: <K extends keyof T>(field: K) => {
        value: T[K];
        onChange: (event: any) => void;
        error: string | ReactNode | undefined;
    };
    reset: () => void;
}

/**
 * Custom form hook that provides form state management and validation
 *
 * This is a lightweight replacement for @mantine/form that works with shadcn/ui
 *
 * @example
 * ```tsx
 * const form = useForm({
 *   initialValues: {
 *     email: '',
 *     password: '',
 *   },
 *   validate: {
 *     email: (val) => (/^\S+@\S+$/.test(val) ? null : 'Invalid email'),
 *     password: (val) => (val ? null : 'Required'),
 *   },
 * });
 *
 * <form onSubmit={form.onSubmit((values) => console.log(values))}>
 *   <input value={form.values.email} onChange={(e) => form.setFieldValue('email', e.target.value)} />
 *   {form.errors.email && <span>{form.errors.email}</span>}
 * </form>
 * ```
 */
export function useForm<T extends Record<string, any>>(config: UseFormConfig<T>): UseFormReturn<T> {
    const [values, setValues] = useState<T>(config.initialValues);
    const [errors, setErrors] = useState<Partial<Record<keyof T, string | ReactNode>>>({});

    const setFieldValue = <K extends keyof T>(field: K, value: T[K]) => {
        setValues((prev) => ({ ...prev, [field]: value }));
        // Clear error when field value changes
        if (errors[field]) {
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const setFieldError = <K extends keyof T>(field: K, error: string | ReactNode) => {
        setErrors((prev) => ({ ...prev, [field]: error }));
    };

    const validateForm = (): boolean => {
        if (!config.validate) {
            return true;
        }

        const newErrors: Partial<Record<keyof T, string | ReactNode>> = {};
        let isValid = true;

        for (const field in config.validate) {
            const validator = config.validate[field];
            if (validator) {
                const error = validator(values[field], values);
                if (error) {
                    newErrors[field] = error;
                    isValid = false;
                }
            }
        }

        setErrors(newErrors);
        return isValid;
    };

    const onSubmit = (callback: (values: T) => void | Promise<void>) => {
        return (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();

            if (validateForm()) {
                callback(values);
            }
        };
    };

    const reset = () => {
        setValues(config.initialValues);
        setErrors({});
    };

    const getInputProps = <K extends keyof T>(field: K) => {
        return {
            value: values[field],
            onChange: (event: any) => {
                const value = event.currentTarget?.value ?? event.target?.value ?? event.currentTarget?.checked ?? event;
                setFieldValue(field, value);
            },
            error: errors[field],
        };
    };

    return {
        values,
        errors,
        setFieldValue,
        setFieldError,
        onSubmit,
        getInputProps,
        reset,
    };
}
