import { useState, FormEvent } from 'react';
import { HalTemplate, HalTemplateProperty } from '@houseofwolves/serverlesslaunchpad.types/hal';
import { ValidationError } from '../../lib/hal_forms_client';

/**
 * Props for TemplateForm component
 */
export interface TemplateFormProps {
    /** The HAL template to render as a form */
    template: HalTemplate;
    /** Callback when form is submitted with valid data */
    onSubmit: (data: Record<string, any>) => void | Promise<void>;
    /** Optional loading state (e.g., during API call) */
    loading?: boolean;
    /** Optional error message to display */
    error?: string | null;
    /** Optional validation errors to display per field */
    validationErrors?: ValidationError[];
    /** Optional callback when form is cancelled */
    onCancel?: () => void;
    /** Optional initial values for form fields */
    initialValues?: Record<string, any>;
    /** Optional flag to hide the form title (useful when modal has its own title) */
    hideTitle?: boolean;
}

/**
 * Generic form component that renders a HAL template as a DaisyUI form
 *
 * Features:
 * - Automatically generates form fields from template properties
 * - Supports various input types (text, number, email, select, textarea, etc.)
 * - Handles required fields and validation
 * - Integrates with DaisyUI components
 * - Displays validation errors per field
 *
 * @example
 * ```tsx
 * const template = {
 *   title: 'Create User',
 *   method: 'POST',
 *   target: '/users',
 *   properties: [
 *     { name: 'email', prompt: 'Email', type: 'email', required: true },
 *     { name: 'name', prompt: 'Name', required: true },
 *     { name: 'age', prompt: 'Age', type: 'number', min: 18 }
 *   ]
 * };
 *
 * function CreateUser() {
 *   const { execute, loading, error, validationErrors } = useExecuteTemplate();
 *
 *   return (
 *     <TemplateForm
 *       template={template}
 *       onSubmit={(data) => execute(template, data)}
 *       loading={loading}
 *       error={error}
 *       validationErrors={validationErrors}
 *     />
 *   );
 * }
 * ```
 */
export function TemplateForm({
    template,
    onSubmit,
    loading = false,
    error = null,
    validationErrors = [],
    onCancel,
    initialValues = {},
    hideTitle = false,
}: TemplateFormProps) {
    // Initialize form state with initial values or defaults
    const [formData, setFormData] = useState<Record<string, any>>(() => {
        const initial: Record<string, any> = { ...initialValues };
        template.properties?.forEach((prop) => {
            if (initial[prop.name] === undefined) {
                initial[prop.name] = prop.value ?? '';
            }
        });
        return initial;
    });

    /**
     * Handle form field changes
     */
    const handleFieldChange = (name: string, value: any) => {
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    /**
     * Handle form submission
     */
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        await onSubmit(formData);
    };

    /**
     * Get validation error for a specific field
     */
    const getFieldError = (fieldName: string): string | undefined => {
        const error = validationErrors.find((err) => err.field === fieldName);
        return error?.message;
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Form Title */}
            {!hideTitle && template.title && <h2 className="text-xl font-semibold">{template.title}</h2>}

            {/* Global Error Alert */}
            {error && (
                <div className="alert alert-error">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6 shrink-0 stroke-current"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                    <span>{error}</span>
                </div>
            )}

            {/* Form Fields */}
            {template.properties?.map((property) => (
                <TemplateField
                    key={property.name}
                    property={property}
                    value={formData[property.name]}
                    onChange={(value) => handleFieldChange(property.name, value)}
                    error={getFieldError(property.name)}
                    disabled={loading || property.readOnly}
                />
            ))}

            {/* Action Buttons */}
            <div className="flex gap-2">
                <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                >
                    {loading ? (
                        <>
                            <span className="loading loading-spinner loading-sm"></span>
                            Loading...
                        </>
                    ) : (
                        template.title || 'Submit'
                    )}
                </button>
                {onCancel && (
                    <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={onCancel}
                        disabled={loading}
                    >
                        Cancel
                    </button>
                )}
            </div>
        </form>
    );
}

/**
 * Props for TemplateField component
 */
interface TemplateFieldProps {
    /** The property definition from the template */
    property: HalTemplateProperty;
    /** Current value */
    value: any;
    /** Change handler */
    onChange: (value: any) => void;
    /** Optional error message */
    error?: string;
    /** Whether the field is disabled */
    disabled?: boolean;
}

/**
 * Renders an appropriate input component based on template property type
 */
function TemplateField({ property, value, onChange, error, disabled }: TemplateFieldProps) {
    const label = property.prompt || property.name;
    const required = property.required || false;

    // Hidden input (for tokens, IDs, etc.)
    if (property.type === 'hidden') {
        return <input type="hidden" name={property.name} value={value} />;
    }

    // Checkbox/Toggle switches for bitfield (multi-select)
    if (property.type === 'checkbox' && property.options && property.options.length > 0) {
        const selectedValues = Array.isArray(value) ? value : [];

        const toggleOption = (optionValue: string) => {
            const newValues = selectedValues.includes(optionValue)
                ? selectedValues.filter((v) => v !== optionValue)
                : [...selectedValues, optionValue];
            onChange(newValues);
        };

        return (
            <div className="form-control space-y-2">
                <label className="label">
                    <span className="label-text font-medium">
                        {label}
                        {required && <span className="text-error ml-1">*</span>}
                    </span>
                </label>
                <div className="border border-base-300 rounded-lg p-4 space-y-3">
                    {property.options.map((opt) => {
                        const optionValue = String(opt.value);
                        const isChecked = selectedValues.includes(optionValue);

                        return (
                            <div key={optionValue} className="form-control">
                                <label className="label cursor-pointer justify-start gap-3">
                                    <span className="label-text flex-1">
                                        {opt.prompt || optionValue}
                                    </span>
                                    <input
                                        type="checkbox"
                                        className="toggle toggle-primary"
                                        checked={isChecked}
                                        onChange={() => toggleOption(optionValue)}
                                        disabled={disabled}
                                    />
                                </label>
                            </div>
                        );
                    })}
                </div>
                {error && (
                    <label className="label">
                        <span className="label-text-alt text-error">{error}</span>
                    </label>
                )}
            </div>
        );
    }

    // Select/dropdown for single-select options (enums)
    if (property.options && property.options.length > 0) {
        return (
            <div className="form-control">
                <label className="label">
                    <span className="label-text">
                        {label}
                        {required && <span className="text-error ml-1">*</span>}
                    </span>
                </label>
                <select
                    className={`select select-bordered w-full ${error ? 'select-error' : ''}`}
                    value={value ?? ''}
                    onChange={(e) => onChange(e.target.value)}
                    required={required}
                    disabled={disabled}
                >
                    <option value="" disabled>
                        Select {label.toLowerCase()}
                    </option>
                    {property.options.map((opt) => (
                        <option key={opt.value} value={String(opt.value)}>
                            {opt.prompt || String(opt.value)}
                        </option>
                    ))}
                </select>
                {error && (
                    <label className="label">
                        <span className="label-text-alt text-error">{error}</span>
                    </label>
                )}
            </div>
        );
    }

    // Textarea for long text
    if (property.type === 'textarea') {
        return (
            <div className="form-control">
                <label className="label">
                    <span className="label-text">
                        {label}
                        {required && <span className="text-error ml-1">*</span>}
                    </span>
                </label>
                <textarea
                    className={`textarea textarea-bordered w-full ${error ? 'textarea-error' : ''}`}
                    placeholder={`Enter ${label.toLowerCase()}`}
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    required={required}
                    disabled={disabled}
                    minLength={property.minLength}
                    maxLength={property.maxLength}
                    rows={4}
                />
                {error && (
                    <label className="label">
                        <span className="label-text-alt text-error">{error}</span>
                    </label>
                )}
            </div>
        );
    }

    // Checkbox for boolean
    if (property.type === 'checkbox') {
        return (
            <div className="form-control">
                <label className="label cursor-pointer justify-start gap-2">
                    <input
                        type="checkbox"
                        className="checkbox"
                        checked={!!value}
                        onChange={(e) => onChange(e.target.checked)}
                        disabled={disabled}
                    />
                    <span className="label-text">
                        {label}
                        {required && <span className="text-error ml-1">*</span>}
                    </span>
                </label>
                {error && (
                    <label className="label">
                        <span className="label-text-alt text-error">{error}</span>
                    </label>
                )}
            </div>
        );
    }

    // Number input
    if (property.type === 'number') {
        return (
            <div className="form-control">
                <label className="label">
                    <span className="label-text">
                        {label}
                        {required && <span className="text-error ml-1">*</span>}
                    </span>
                </label>
                <input
                    type="number"
                    className={`input input-bordered w-full ${error ? 'input-error' : ''}`}
                    placeholder={`Enter ${label.toLowerCase()}`}
                    value={value ?? ''}
                    onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
                    required={required}
                    disabled={disabled}
                    min={property.min as number | undefined}
                    max={property.max as number | undefined}
                />
                {error && (
                    <label className="label">
                        <span className="label-text-alt text-error">{error}</span>
                    </label>
                )}
            </div>
        );
    }

    // Text input (default for text, email, url, tel, date, etc.)
    const inputType = property.type || 'text';
    return (
        <div className="form-control">
            <label className="label">
                <span className="label-text">
                    {label}
                    {required && <span className="text-error ml-1">*</span>}
                </span>
            </label>
            <input
                type={inputType}
                className={`input input-bordered w-full ${error ? 'input-error' : ''}`}
                placeholder={`Enter ${label.toLowerCase()}`}
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                required={required}
                disabled={disabled}
                minLength={property.minLength}
                maxLength={property.maxLength}
            />
            {error && (
                <label className="label">
                    <span className="label-text-alt text-error">{error}</span>
                </label>
            )}
        </div>
    );
}
