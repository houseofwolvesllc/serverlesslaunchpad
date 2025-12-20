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

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import {
    humanizeLabel,
    type HalObject,
    type InferenceOptions,
    type TemplateExecutionContext,
    buildTemplateData,
    type InferredColumn,
} from '@houseofwolves/serverlesslaunchpad.web.commons';
import {
    useHalResourceDetail,
} from '@houseofwolves/serverlesslaunchpad.web.commons.react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { getFieldRenderer, type FieldRenderer } from '../hal_collection/field_renderers';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TemplateForm } from '@/components/hal_forms/template_form';
import { ConfirmationDialog } from '@/components/ui/confirmation_dialog';
import type { HalTemplate } from '@houseofwolves/serverlesslaunchpad.types/hal';
import { toast } from 'sonner';

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
    // Use the hook for business logic
    const {
        pageTitle,
        fields,
        displayableTemplates,
        executingTemplate,
        setExecutingTemplate,
        handleTemplateAction,
        getTemplateConfirmation,
    } = useHalResourceDetail({
        resource,
        fieldConfig,
        fallbackTitle: 'Resource Details',
    });

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

    // Execute template with context
    const executeTemplate = async (
        template: HalTemplate,
        context: TemplateExecutionContext,
        showToast: boolean = true
    ) => {
        if (!onTemplateExecute) return;

        try {
            const data = buildTemplateData(context);
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

        const result = handleTemplateAction(templateKey, template);

        // Categorize and handle accordingly
        if (result.category === 'navigation') {
            // Navigation templates: execute immediately (shouldn't happen in detail view)
            setExecutingTemplate(templateKey);
            try {
                // Don't show toast for navigation templates
                await executeTemplate(template, result.context!, false);
            } finally {
                setExecutingTemplate(null);
            }
        } else if (result.category === 'form') {
            // Form templates: show form dialog
            setFormState({
                open: true,
                template,
                templateKey,
            });
        } else {
            // Action templates: show confirmation dialog
            setConfirmationState({
                open: true,
                template,
                context: result.context!,
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
            ([, template]) => template === confirmationState.template
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
                <label className="text-sm font-medium text-muted-foreground">
                    {field.label}
                </label>
                <div className="text-sm">
                    {renderer(value, field, resource)}
                </div>
            </div>
        );
    };

    // Loading state
    if (loading) {
        return (
            <div className="space-y-6">
                {/* Breadcrumb skeleton */}
                <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-32" />
                </div>

                {/* Header skeleton */}
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <div className="flex gap-2">
                        <Skeleton className="h-9 w-24" />
                        <Skeleton className="h-9 w-24" />
                    </div>
                </div>

                {/* Content skeleton */}
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-32" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="space-y-6">
                {/* Error alert */}
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error Loading Resource</AlertTitle>
                    <AlertDescription>
                        {error.message || 'Failed to load resource. Please try again.'}
                    </AlertDescription>
                </Alert>

                {onRefresh && (
                    <Button onClick={onRefresh} variant="outline">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Try Again
                    </Button>
                )}
            </div>
        );
    }

    // No resource state
    if (!resource) {
        return (
            <div className="space-y-6">
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>No Resource</AlertTitle>
                    <AlertDescription>
                        No resource data available.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">{pageTitle}</h1>
                {resource.email && (
                    <p className="text-muted-foreground">
                        {resource.email}
                    </p>
                )}
            </div>

            {/* Action toolbar */}
            <div className="flex items-center justify-end gap-2">
                {/* Template action buttons */}
                {displayableTemplates.map(([key, template]) => (
                    <Button
                        key={key}
                        variant="outline"
                        size="sm"
                        onClick={() => handleTemplateClick(key, template as HalTemplate)}
                        disabled={executingTemplate === key}
                    >
                        {executingTemplate === key ? 'Executing...' : (template as any).title || humanizeLabel(key)}
                    </Button>
                ))}

                {onRefresh && (
                    <Button variant="outline" onClick={onRefresh} size="sm">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh
                    </Button>
                )}
            </div>

            {/* Overview Section (Primary Fields) */}
            {fields.overview.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Overview</CardTitle>
                        <CardDescription>Primary identifying information</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {fields.overview.map(renderField)}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Details Section (All Other Fields) */}
            {fields.details.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Details</CardTitle>
                        <CardDescription>All resource fields</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {fields.details.map(renderField)}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Form Dialog for update/edit templates */}
            {formState.template && (
                <Dialog open={formState.open} onOpenChange={(open) => {
                    if (!open) {
                        setFormState({ open: false, template: null, templateKey: null });
                    }
                }}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {formState.template.title || humanizeLabel(formState.templateKey || '')}
                            </DialogTitle>
                            <DialogDescription>
                                Fill out the form below and submit.
                            </DialogDescription>
                        </DialogHeader>
                        <TemplateForm
                            key={`${formState.templateKey}-${resource?.userId || resource?.id || Date.now()}`}
                            template={formState.template}
                            onSubmit={handleFormSubmit}
                            onCancel={() => setFormState({ open: false, template: null, templateKey: null })}
                            loading={executingTemplate !== null}
                            hideTitle={true}
                            initialValues={resource || {}}
                        />
                    </DialogContent>
                </Dialog>
            )}

            {/* Confirmation Dialog for action templates */}
            {confirmationState.template && confirmationState.context && (
                <ConfirmationDialog
                    open={confirmationState.open}
                    onOpenChange={(open) => {
                        if (!open) {
                            setConfirmationState({ open: false, template: null, context: null });
                        }
                    }}
                    {...getTemplateConfirmation(confirmationState.template, confirmationState.context)}
                    onConfirm={handleConfirmAction}
                    loading={executingTemplate !== null}
                />
            )}
        </div>
    );
}
