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
import { RefreshCw, AlertCircle } from 'lucide-react';
import {
    humanizeLabel,
    type HalObject,
    type InferredColumn,
    type InferenceOptions,
    buildTemplateData,
    getConfirmationConfig,
    type TemplateExecutionContext,
} from '@houseofwolves/serverlesslaunchpad.web.commons';
import {
    useHalResourceDetail,
} from '@houseofwolves/serverlesslaunchpad.web.commons.react';
import { Paper, Title, Text, Button, Skeleton, Alert, Modal, Stack, Group } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { getFieldRenderer, type FieldRenderer } from '../hal_collection/field_renderers';
import { TemplateForm } from '@/components/hal_forms/template_form';
import type { HalTemplate } from '@houseofwolves/serverlesslaunchpad.types/hal';

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
 * Inline Confirmation Dialog Component using Mantine Modal
 */
interface ConfirmationDialogProps {
    opened: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    loading?: boolean;
}

function ConfirmationDialog({
    opened,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    loading = false,
}: ConfirmationDialogProps) {
    const handleConfirm = async () => {
        await onConfirm();
        onClose();
    };

    return (
        <Modal opened={opened} onClose={onClose} title={title} centered>
            <Stack gap="lg">
                <Text size="sm">{message}</Text>
                <Group justify="flex-end" gap="sm">
                    <Button variant="default" onClick={onClose} disabled={loading}>
                        {cancelLabel}
                    </Button>
                    <Button color="red" onClick={handleConfirm} loading={loading}>
                        {confirmLabel}
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
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

    // Use the hook for all business logic
    const {
        pageTitle,
        fields,
        displayableTemplates,
        executingTemplate,
        setExecutingTemplate,
        handleTemplateAction,
    } = useHalResourceDetail({
        resource,
        fieldConfig,
        fallbackTitle: 'Resource Details',
    });

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
                notifications.show({
                    title: 'Success',
                    message: template.title || 'Action completed',
                    color: 'green',
                });
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Operation failed';
            // Only show error toast for non-navigation templates
            if (showToast) {
                notifications.show({
                    title: 'Error',
                    message,
                    color: 'red',
                });
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

        setExecutingTemplate('action');

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
            <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <Text size="sm" fw={500} c="dimmed">
                    {field.label}
                </Text>
                <div>
                    {renderer(value, field, resource)}
                </div>
            </div>
        );
    };

    // Loading state
    if (loading) {
        return (
            <Stack gap="lg">
                {/* Breadcrumb skeleton */}
                <Group gap="xs">
                    <Skeleton height={16} width={64} />
                    <Skeleton height={16} width={16} />
                    <Skeleton height={16} width={128} />
                </Group>

                {/* Header skeleton */}
                <Stack gap="xs">
                    <Skeleton height={32} width={192} />
                    <Group gap="xs">
                        <Skeleton height={36} width={96} />
                        <Skeleton height={36} width={96} />
                    </Group>
                </Stack>

                {/* Content skeleton */}
                <Paper shadow="xs" p="md" withBorder>
                    <Skeleton height={24} width={128} mb="md" />
                    <Stack gap="md">
                        <Skeleton height={64} />
                        <Skeleton height={64} />
                        <Skeleton height={64} />
                    </Stack>
                </Paper>
            </Stack>
        );
    }

    // Error state
    if (error) {
        return (
            <Stack gap="lg">
                {/* Error alert */}
                <Alert icon={<AlertCircle size={16} />} title="Error Loading Resource" color="red">
                    {error.message || 'Failed to load resource. Please try again.'}
                </Alert>

                {onRefresh && (
                    <Button variant="outline" onClick={onRefresh} leftSection={<RefreshCw size={16} />}>
                        Try Again
                    </Button>
                )}
            </Stack>
        );
    }

    // No resource state
    if (!resource) {
        return (
            <Stack gap="lg">
                <Alert icon={<AlertCircle size={16} />} title="No Resource" color="blue">
                    No resource data available.
                </Alert>
            </Stack>
        );
    }

    return (
        <Stack gap="lg">
            {/* Page Header */}
            <Stack gap={4}>
                <Title order={1}>{pageTitle}</Title>
                {resource.email && (
                    <Text c="dimmed">
                        {resource.email}
                    </Text>
                )}
            </Stack>

            {/* Action toolbar */}
            <Group justify="flex-end" gap="xs">
                {/* Template action buttons */}
                {displayableTemplates.map(([key, template]) => (
                    <Button
                        key={key}
                        variant="default"
                        size="sm"
                        onClick={() => handleTemplateClick(key, template as HalTemplate)}
                        loading={executingTemplate === key}
                    >
                        {(template as any).title || humanizeLabel(key)}
                    </Button>
                ))}

                {onRefresh && (
                    <Button
                        variant="default"
                        onClick={onRefresh}
                        size="sm"
                        leftSection={<RefreshCw size={16} />}
                    >
                        Refresh
                    </Button>
                )}
            </Group>

            {/* Overview Section (Primary Fields) */}
            {fields.overview.length > 0 && (
                <Paper shadow="xs" p="md" withBorder>
                    <Title order={3} mb="md">Overview</Title>
                    <Text size="sm" c="dimmed" mb="md">Primary identifying information</Text>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                        gap: '16px'
                    }}>
                        {fields.overview.map(renderField)}
                    </div>
                </Paper>
            )}

            {/* Details Section (All Other Fields) */}
            {fields.details.length > 0 && (
                <Paper shadow="xs" p="md" withBorder>
                    <Title order={3} mb="md">Details</Title>
                    <Text size="sm" c="dimmed" mb="md">All resource fields</Text>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                        gap: '16px'
                    }}>
                        {fields.details.map(renderField)}
                    </div>
                </Paper>
            )}

            {/* Form Dialog for update/edit templates */}
            {formState.template && (
                <Modal
                    opened={formState.open}
                    onClose={() => setFormState({ open: false, template: null, templateKey: null })}
                    title={formState.template.title || humanizeLabel(formState.templateKey || '')}
                    centered
                    size="lg"
                >
                    <Text size="sm" c="dimmed" mb="md">
                        Fill out the form below and submit.
                    </Text>
                    <TemplateForm
                        key={`${formState.templateKey}-${resource?.userId || resource?.id || Date.now()}`}
                        template={formState.template}
                        onSubmit={handleFormSubmit}
                        onCancel={() => setFormState({ open: false, template: null, templateKey: null })}
                        loading={executingTemplate !== null}
                        hideTitle={true}
                        initialValues={resource || {}}
                    />
                </Modal>
            )}

            {/* Confirmation Dialog for action templates */}
            {confirmationState.template && confirmationState.context && (
                <ConfirmationDialog
                    opened={confirmationState.open}
                    onClose={() => setConfirmationState({ open: false, template: null, context: null })}
                    {...getConfirmationConfig(confirmationState.template, confirmationState.context)}
                    onConfirm={handleConfirmAction}
                    loading={executingTemplate !== null}
                />
            )}
        </Stack>
    );
}
