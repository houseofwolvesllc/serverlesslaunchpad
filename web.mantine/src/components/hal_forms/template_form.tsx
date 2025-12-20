import { useState, FormEvent } from 'react';
import {
    TextInput,
    NumberInput,
    Textarea,
    Select,
    Button,
    Stack,
    Title,
    Alert,
} from '@mantine/core';
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
    /** Optional flag to hide the form title (useful when title is already shown in parent, e.g., Modal) */
    hideTitle?: boolean;
}

/**
 * Generic form component that renders a HAL template as a Mantine form
 *
 * Features:
 * - Automatically generates form fields from template properties
 * - Supports various input types (text, number, email, select, textarea, etc.)
 * - Handles required fields and validation
 * - Integrates with Mantine UI components
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
        <form onSubmit={handleSubmit}>
            <Stack gap="md">
                {/* Form Title - conditionally hidden */}
                {!hideTitle && template.title && <Title order={2}>{template.title}</Title>}

                {/* Global Error Alert */}
                {error && (
                    <Alert color="red" title="Error">
                        {error}
                    </Alert>
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
                <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'row' }}>
                    <Button type="submit" loading={loading}>
                        {template.title || 'Submit'}
                    </Button>
                    {onCancel && (
                        <Button variant="subtle" onClick={onCancel} disabled={loading}>
                            Cancel
                        </Button>
                    )}
                </div>
            </Stack>
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

    // Select/dropdown for options
    if (property.options && property.options.length > 0) {
        const selectData = property.options.map((opt) => ({
            value: String(opt.value),
            label: opt.prompt || String(opt.value),
        }));

        return (
            <Select
                label={label}
                placeholder={`Select ${label.toLowerCase()}`}
                data={selectData}
                value={value != null ? String(value) : null}
                onChange={(val) => onChange(val)}
                required={required}
                error={error}
                disabled={disabled}
                searchable
            />
        );
    }

    // Textarea for long text
    if (property.type === 'textarea') {
        return (
            <Textarea
                label={label}
                placeholder={`Enter ${label.toLowerCase()}`}
                value={value || ''}
                onChange={(e) => onChange(e.currentTarget.value)}
                required={required}
                error={error}
                disabled={disabled}
                minLength={property.minLength}
                maxLength={property.maxLength}
                rows={4}
            />
        );
    }

    // Number input
    if (property.type === 'number') {
        return (
            <NumberInput
                label={label}
                placeholder={`Enter ${label.toLowerCase()}`}
                value={value ?? undefined}
                onChange={onChange}
                required={required}
                error={error}
                disabled={disabled}
                min={property.min as number | undefined}
                max={property.max as number | undefined}
            />
        );
    }

    // Text input (default for text, email, url, tel, date, etc.)
    const inputType = property.type || 'text';
    return (
        <TextInput
            label={label}
            type={inputType}
            placeholder={`Enter ${label.toLowerCase()}`}
            value={value || ''}
            onChange={(e) => onChange(e.currentTarget.value)}
            required={required}
            error={error}
            disabled={disabled}
            minLength={property.minLength}
            maxLength={property.maxLength}
        />
    );
}
