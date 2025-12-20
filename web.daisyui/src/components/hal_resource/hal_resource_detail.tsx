/**
 * HalResourceDetail - Renders a single HAL resource with inferred field types
 *
 * This component automatically displays a resource in a card-based layout with:
 * - Breadcrumb navigation (Home → Current page)
 * - Field display sections (Overview, Details)
 * - Template actions section with categorization
 * - Type-based field rendering
 * - Form modals for update/edit templates
 * - Confirmation dialogs for action templates
 * - Filtered delete operations (only in list views)
 */

import { useState, useRef, useEffect } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import {
    humanizeLabel,
    type HalObject,
    type InferenceOptions,
    type InferredColumn,
    categorizeTemplate,
    type TemplateExecutionContext,
} from '@houseofwolves/serverlesslaunchpad.web.commons';
import {
    useHalResourceDetail,
} from '@houseofwolves/serverlesslaunchpad.web.commons.react';
import { getFieldRenderer, type FieldRenderer } from '../hal_collection/field_renderers';
import { TemplateForm } from '@/components/hal_forms/template_form';
import type { HalTemplate } from '@houseofwolves/serverlesslaunchpad.types/hal';
import toast from 'react-hot-toast';

export interface HalResourceDetailProps {
    resource: HalObject | null | undefined;
    fieldConfig?: InferenceOptions;
    customRenderers?: Record<string, FieldRenderer>;
    onRefresh?: () => void;
    onTemplateExecute?: (template: any, data: any) => Promise<void>;
    loading?: boolean;
    error?: Error | null;
}

/**
 * Renders a single HAL resource with inferred fields and sections
 *
 * @example
 * ```tsx
 * <HalResourceDetail
 *   resource={user}
 *   fieldConfig={{
 *     fieldTypeOverrides: { userId: FieldType.CODE },
 *     labelOverrides: { userId: 'User ID' }
 *   }}
 *   customRenderers={{
 *     avatar: (value) => <Avatar url={value} />
 *   }}
 *   onRefresh={refetch}
 *   onTemplateExecute={handleTemplateExecute}
 * />
 * ```
 */
export function HalResourceDetail({
    resource,
    fieldConfig = {},
    customRenderers,
    onRefresh,
    onTemplateExecute,
    loading = false,
    error = null,
}: HalResourceDetailProps) {
    const [executingTemplate, setExecutingTemplate] = useState<string | null>(null);

    // State for form dialog
    const [formState, setFormState] = useState<{
        open: boolean;
        template: HalTemplate | null;
        templateKey: string | null;
    }>({ open: false, template: null, templateKey: null });

    // State for confirmation dialog
    const [confirmationState, setConfirmationState] = useState<{
        open: boolean;
        template: HalTemplate | null;
        context: TemplateExecutionContext | null;
    }>({ open: false, template: null, context: null });

    // Refs for DaisyUI modals
    const formModalRef = useRef<HTMLDialogElement>(null);
    const confirmationModalRef = useRef<HTMLDialogElement>(null);

    // Use the commons hook for business logic
    const {
        pageTitle,
        fields,
        displayableTemplates,
        getTemplateConfirmation,
        prepareTemplateExecution,
    } = useHalResourceDetail({
        resource,
        fieldConfig,
        fallbackTitle: 'Resource Details',
    });

    // Shorthand for field organization
    const overviewFields = fields.overview;
    const detailFields = fields.details;
    const templateEntries = displayableTemplates;

    // Handle modal opening/closing with native dialog API
    useEffect(() => {
        if (formState.open && formModalRef.current) {
            formModalRef.current.showModal();
        } else if (!formState.open && formModalRef.current) {
            formModalRef.current.close();
        }
    }, [formState.open]);

    useEffect(() => {
        if (confirmationState.open && confirmationModalRef.current) {
            confirmationModalRef.current.showModal();
        } else if (!confirmationState.open && confirmationModalRef.current) {
            confirmationModalRef.current.close();
        }
    }, [confirmationState.open]);

    // Execute template with context
    const executeTemplate = async (
        template: HalTemplate,
        context: TemplateExecutionContext,
        showToast: boolean = true
    ) => {
        if (!onTemplateExecute) return;

        try {
            const { data } = prepareTemplateExecution(template, context);
            await onTemplateExecute(template, data);

            // Refresh to get updated data (cache-busting handled by useHalResource)
            if (onRefresh) {
                await onRefresh();
            }

            // Only show success toast for non-navigation templates
            if (showToast) {
                toast.success(template.title || 'Action completed');
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Operation failed';
            // Only show error toast for non-navigation templates
            if (showToast) {
                toast.error(message);
            }
            throw error;
        }
    };

    // Handle template button click with categorization
    const handleTemplateClick = async (templateKey: string, template: HalTemplate) => {
        if (!onTemplateExecute) return;

        const category = categorizeTemplate(templateKey, template);

        // Categorize and handle accordingly
        if (category === 'navigation') {
            // Navigation templates: execute immediately (shouldn't happen in detail view)
            const context: TemplateExecutionContext = {
                template,
                resource,
            };
            setExecutingTemplate(templateKey);
            try {
                // Don't show toast for navigation templates
                await executeTemplate(template, context, false);
            } finally {
                setExecutingTemplate(null);
            }
        } else if (category === 'form') {
            // Form templates: show form dialog
            setFormState({
                open: true,
                template,
                templateKey,
            });
        } else {
            // Action templates: show confirmation dialog
            const context: TemplateExecutionContext = {
                template,
                resource,
            };
            setConfirmationState({
                open: true,
                template,
                context,
            });
        }
    };

    // Handle form dialog submit
    const handleFormSubmit = async (formData: Record<string, any>) => {
        if (!formState.template) return;

        setExecutingTemplate(formState.templateKey || 'form');

        try {
            const context: TemplateExecutionContext = {
                template: formState.template,
                formData,
                resource,
            };

            await executeTemplate(formState.template, context);
            setFormState({ open: false, template: null, templateKey: null });
        } finally {
            setExecutingTemplate(null);
        }
    };

    // Handle confirmation dialog confirm
    const handleConfirmAction = async () => {
        if (!confirmationState.template || !confirmationState.context) return;

        const templateKey = displayableTemplates.find(
            ([_, tmpl]) => tmpl === confirmationState.template
        )?.[0];

        setExecutingTemplate(templateKey || 'action');

        try {
            await executeTemplate(confirmationState.template, confirmationState.context);
            setConfirmationState({ open: false, template: null, context: null });
        } finally {
            setExecutingTemplate(null);
        }
    };

    // Render a single field
    const renderField = (field: InferredColumn) => {
        if (!resource) return null;

        const value = resource[field.key];
        const renderer = getFieldRenderer(field, customRenderers);

        return (
            <div key={field.key} className="space-y-1">
                <label className="text-sm font-medium text-base-content/70">
                    {field.label}
                </label>
                <div className="text-sm">
                    {renderer(value, field, resource)}
                </div>
            </div>
        );
    };

    // Get confirmation config for confirmation dialog
    const confirmConfig = confirmationState.template && confirmationState.context
        ? getTemplateConfirmation(confirmationState.template, confirmationState.context)
        : null;

    // Loading state
    if (loading) {
        return (
            <div className="space-y-6">
                {/* Breadcrumb skeleton */}
                <div className="flex items-center gap-2">
                    <div className="skeleton h-4 w-16"></div>
                    <div className="skeleton h-4 w-4"></div>
                    <div className="skeleton h-4 w-32"></div>
                </div>

                {/* Header skeleton */}
                <div className="space-y-2">
                    <div className="skeleton h-8 w-48"></div>
                    <div className="flex gap-2">
                        <div className="skeleton h-9 w-24"></div>
                        <div className="skeleton h-9 w-24"></div>
                    </div>
                </div>

                {/* Content skeleton */}
                <div className="card bg-base-100 shadow-xl">
                    <div className="card-body">
                        <div className="skeleton h-6 w-32 mb-4"></div>
                        <div className="space-y-4">
                            <div className="skeleton h-16 w-full"></div>
                            <div className="skeleton h-16 w-full"></div>
                            <div className="skeleton h-16 w-full"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="space-y-6">
                {/* Error alert */}
                <div className="alert alert-error">
                    <AlertCircle className="w-5 h-5" />
                    <div>
                        <h3 className="font-bold">Error Loading Resource</h3>
                        <div className="text-sm">
                            {error.message || 'Failed to load resource. Please try again.'}
                        </div>
                    </div>
                </div>

                {onRefresh && (
                    <button onClick={onRefresh} className="btn border border-base-300 bg-base-100 hover:bg-base-200">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Try Again
                    </button>
                )}
            </div>
        );
    }

    // No resource state
    if (!resource) {
        return (
            <div className="space-y-6">
                <div className="alert">
                    <AlertCircle className="w-5 h-5" />
                    <div>
                        <h3 className="font-bold">No Resource</h3>
                        <div className="text-sm">
                            No resource data available.
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">{pageTitle}</h1>
                {resource.email && (
                    <p className="text-base-content/70">
                        {resource.email}
                    </p>
                )}
            </div>

            {/* Action toolbar */}
            <div className="flex items-center justify-end gap-2">
                {/* Template action buttons */}
                {templateEntries.map(([key, template]) => (
                    <button
                        key={key}
                        className="btn btn-sm border border-base-300 bg-base-100 hover:bg-base-200"
                        onClick={() => handleTemplateClick(key, template as HalTemplate)}
                        disabled={executingTemplate === key}
                    >
                        {executingTemplate === key ? (
                            <>
                                <span className="loading loading-spinner loading-xs"></span>
                                Executing...
                            </>
                        ) : (
                            (template as any).title || humanizeLabel(key)
                        )}
                    </button>
                ))}

                {onRefresh && (
                    <button className="btn btn-sm border border-base-300 bg-base-100 hover:bg-base-200" onClick={onRefresh}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh
                    </button>
                )}
            </div>

            {/* Overview Section (Primary Fields) */}
            {overviewFields.length > 0 && (
                <div className="card bg-base-100 shadow-xl">
                    <div className="card-body">
                        <h2 className="card-title">Overview</h2>
                        <p className="text-base-content/70">Primary identifying information</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            {overviewFields.map(renderField)}
                        </div>
                    </div>
                </div>
            )}

            {/* Details Section (All Other Fields) */}
            {detailFields.length > 0 && (
                <div className="card bg-base-100 shadow-xl">
                    <div className="card-body">
                        <h2 className="card-title">Details</h2>
                        <p className="text-base-content/70">All resource fields</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            {detailFields.map(renderField)}
                        </div>
                    </div>
                </div>
            )}

            {/* Form Dialog for update/edit templates */}
            {formState.template && (
                <dialog ref={formModalRef} className="modal">
                    <div className="modal-box">
                        <h3 className="font-bold text-lg">
                            {formState.template.title || humanizeLabel(formState.templateKey || '')}
                        </h3>
                        <p className="text-base-content/70 py-2">
                            Fill out the form below and submit.
                        </p>
                        <TemplateForm
                            key={`${formState.templateKey}-${resource?.userId || resource?.id || Date.now()}`}
                            template={formState.template}
                            onSubmit={handleFormSubmit}
                            onCancel={() => setFormState({ open: false, template: null, templateKey: null })}
                            loading={executingTemplate !== null}
                            hideTitle={true}
                            initialValues={resource || {}}
                        />
                    </div>
                    <form method="dialog" className="modal-backdrop" onClick={() => setFormState({ open: false, template: null, templateKey: null })}>
                        <button>close</button>
                    </form>
                </dialog>
            )}

            {/* Confirmation Dialog for action templates */}
            {confirmationState.template && confirmationState.context && confirmConfig && (
                <dialog ref={confirmationModalRef} className="modal">
                    <div className="modal-box">
                        <h3 className="font-bold text-lg">{confirmConfig.title}</h3>
                        <p className="py-4">{confirmConfig.message}</p>
                        {confirmConfig.variant === 'destructive' && (
                            <div className="alert alert-warning mb-4">
                                <AlertCircle className="w-5 h-5" />
                                <span>This action cannot be undone.</span>
                            </div>
                        )}
                        <div className="modal-action">
                            <button
                                className="btn btn-ghost"
                                onClick={() => setConfirmationState({ open: false, template: null, context: null })}
                                disabled={executingTemplate !== null}
                            >
                                {confirmConfig.cancelLabel || 'Cancel'}
                            </button>
                            <button
                                className={`btn ${confirmConfig.variant === 'destructive' ? 'btn-error' : 'btn-primary'}`}
                                onClick={handleConfirmAction}
                                disabled={executingTemplate !== null}
                            >
                                {executingTemplate !== null ? (
                                    <>
                                        <span className="loading loading-spinner loading-xs"></span>
                                        Processing...
                                    </>
                                ) : (
                                    confirmConfig.confirmLabel || 'Confirm'
                                )}
                            </button>
                        </div>
                    </div>
                    <form method="dialog" className="modal-backdrop" onClick={() => setConfirmationState({ open: false, template: null, context: null })}>
                        <button>close</button>
                    </form>
                </dialog>
            )}
        </div>
    );
}
