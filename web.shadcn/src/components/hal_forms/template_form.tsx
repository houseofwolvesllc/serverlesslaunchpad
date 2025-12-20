import { useState, FormEvent } from 'react';
import { HalTemplate, HalTemplateProperty } from '@houseofwolves/serverlesslaunchpad.types/hal';
import { ValidationError } from '../../lib/hal_forms_client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

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
    /** Hide the template title (useful when title is already shown in modal header) */
    hideTitle?: boolean;
}

/**
 * Generic form component that renders a HAL template as a shadcn/ui form
 *
 * Features:
 * - Automatically generates form fields from template properties
 * - Supports various input types (text, number, email, select, textarea, etc.)
 * - Handles required fields and validation
 * - Integrates with shadcn/ui components
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
                // For checkbox (bitfield) type, ensure value is an array
                if (prop.type === 'checkbox' && prop.value) {
                    initial[prop.name] = Array.isArray(prop.value) ? prop.value : [];
                } else {
                    initial[prop.name] = prop.value ?? '';
                }
            }
        });
        return initial;
    });


    /**
     * Handle form field changes
     */
    const handleFieldChange = (name: string, value: any) => {
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    /**
     * Handle form submission
     * Filters out read-only fields before submitting
     */
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        // Filter out read-only fields from submission
        const submittableData: Record<string, any> = {};
        template.properties?.forEach((prop) => {
            if (!prop.readOnly && formData[prop.name] !== undefined) {
                submittableData[prop.name] = formData[prop.name];
            }
        });

        await onSubmit(submittableData);
    };

    /**
     * Get validation error for a specific field
     */
    const getFieldError = (fieldName: string): string | undefined => {
        const error = validationErrors.find((err) => err.field === fieldName);
        return error?.message;
    };

    // Check if this is a DELETE operation
    const isDeleteOperation = template.method?.toUpperCase() === 'DELETE';

    return (
        <form onSubmit={handleSubmit}>
            <div className="flex flex-col space-y-4">
                {/* Form Title - conditionally hidden if displayed in modal header */}
                {!hideTitle && template.title && <h2 className="text-2xl font-semibold">{template.title}</h2>}

                {/* DELETE Warning Alert */}
                {isDeleteOperation && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Warning: Destructive Action</AlertTitle>
                        <AlertDescription>
                            This action will delete data and cannot be undone. Please review the information below
                            carefully before proceeding.
                        </AlertDescription>
                    </Alert>
                )}

                {/* Global Error Alert */}
                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
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
                <div className="flex items-center gap-2">
                    <Button
                        type="submit"
                        disabled={loading}
                        variant={isDeleteOperation ? 'destructive' : 'default'}
                    >
                        {template.title || 'Submit'}
                    </Button>
                    {onCancel && (
                        <Button variant="ghost" onClick={onCancel} disabled={loading} type="button">
                            Cancel
                        </Button>
                    )}
                </div>
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
            <div className="flex flex-col space-y-3">
                <Label>
                    {label}
                    {required && <span className="text-destructive ml-1">*</span>}
                </Label>
                <div className="space-y-3 rounded-lg border p-4">
                    {property.options.map((opt) => {
                        const optionValue = String(opt.value);
                        const isChecked = selectedValues.includes(optionValue);

                        return (
                            <div key={optionValue} className="flex items-center justify-between space-x-2">
                                <Label
                                    htmlFor={`${property.name}-${optionValue}`}
                                    className="text-sm font-normal cursor-pointer flex-1"
                                >
                                    {opt.prompt || optionValue}
                                </Label>
                                <Switch
                                    id={`${property.name}-${optionValue}`}
                                    checked={isChecked}
                                    onCheckedChange={() => toggleOption(optionValue)}
                                    disabled={disabled}
                                />
                            </div>
                        );
                    })}
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
        );
    }

    // Select/dropdown for single-select options (enums)
    if (property.options && property.options.length > 0) {
        return (
            <div className="flex flex-col space-y-2">
                <Label htmlFor={property.name}>
                    {label}
                    {required && <span className="text-destructive ml-1">*</span>}
                </Label>
                <Select
                    value={value ? String(value) : undefined}
                    onValueChange={(val) => onChange(val)}
                    disabled={disabled}
                >
                    <SelectTrigger id={property.name}>
                        <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                        {property.options.map((opt) => (
                            <SelectItem key={String(opt.value)} value={String(opt.value)}>
                                {opt.prompt || String(opt.value)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
        );
    }

    // Textarea for long text
    if (property.type === 'textarea') {
        return (
            <div className="flex flex-col space-y-2">
                <Label htmlFor={property.name}>
                    {label}
                    {required && <span className="text-destructive ml-1">*</span>}
                </Label>
                <Textarea
                    id={property.name}
                    placeholder={`Enter ${label.toLowerCase()}`}
                    value={value || ''}
                    onChange={(e) => onChange(e.currentTarget.value)}
                    required={required}
                    disabled={disabled}
                    minLength={property.minLength}
                    maxLength={property.maxLength}
                    rows={4}
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
        );
    }

    // Number input
    if (property.type === 'number') {
        return (
            <div className="flex flex-col space-y-2">
                <Label htmlFor={property.name}>
                    {label}
                    {required && <span className="text-destructive ml-1">*</span>}
                </Label>
                <Input
                    id={property.name}
                    type="number"
                    placeholder={`Enter ${label.toLowerCase()}`}
                    value={value ?? ''}
                    onChange={(e) => {
                        const val = e.currentTarget.value;
                        onChange(val === '' ? undefined : Number(val));
                    }}
                    required={required}
                    disabled={disabled}
                    min={property.min as number | undefined}
                    max={property.max as number | undefined}
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
        );
    }

    // Text input (default for text, email, url, tel, date, etc.)
    const inputType = property.type || 'text';
    return (
        <div className="flex flex-col space-y-2">
            <Label htmlFor={property.name}>
                {label}
                {required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
                id={property.name}
                type={inputType}
                placeholder={`Enter ${label.toLowerCase()}`}
                value={value || ''}
                onChange={(e) => onChange(e.currentTarget.value)}
                required={required}
                disabled={disabled}
                minLength={property.minLength}
                maxLength={property.maxLength}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
    );
}
