import { useState } from 'react';
import { Modal, Stack } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { TemplateForm } from '../../../components/hal_forms/template_form';
import { useExecuteTemplate } from '../../../hooks/use_hal_resource';
import { HalTemplate } from '../../../types/hal';
import { ApiKeyDisplay } from './api_key_display';

/**
 * Props for CreateApiKeyModal component
 */
interface CreateApiKeyModalProps {
    /** HAL-FORMS template for creating API keys */
    template?: HalTemplate;
    /** Whether the modal is open */
    opened: boolean;
    /** Callback when modal should close */
    onClose: () => void;
}

/**
 * Created API key response
 */
interface CreatedApiKey {
    apiKeyId: string;
    apiKey: string;
    label: string;
    dateCreated: string;
}

/**
 * Create API Key Modal Component using HAL-FORMS templates
 *
 * Two-state modal that allows users to create new API keys:
 * 1. Form View: Template-driven form
 * 2. Success View: Display the newly created API key (one-time only)
 *
 * The form is dynamically generated from the HAL-FORMS template provided
 * by the API, ensuring the form always matches the server's requirements.
 *
 * @example
 * ```tsx
 * const { data } = useApiKeys();
 * const createTemplate = data?._templates?.create;
 *
 * <CreateApiKeyModal
 *   template={createTemplate}
 *   opened={opened}
 *   onClose={close}
 * />
 * ```
 */
export function CreateApiKeyModal({ template, opened, onClose }: CreateApiKeyModalProps) {
    const [step, setStep] = useState<'form' | 'success'>('form');
    const [createdKey, setCreatedKey] = useState<CreatedApiKey | null>(null);

    const { execute, loading, error, validationErrors, reset } = useExecuteTemplate(
        (result: any) => {
            // Success callback - API returns the full key (one-time)
            if (result.apiKeyId && result.apiKey) {
                setCreatedKey({
                    apiKeyId: result.apiKeyId,
                    apiKey: result.apiKey,
                    label: result.label,
                    dateCreated: result.dateCreated,
                });
                setStep('success');
            } else {
                notifications.show({
                    title: 'Success',
                    message: 'API key created successfully',
                    color: 'green',
                });
                handleClose();
            }
        }
    );

    const handleSubmit = async (formData: Record<string, any>) => {
        if (!template) return;

        try {
            await execute(template, formData);
        } catch (err) {
            // Error is handled by useExecuteTemplate hook
            notifications.show({
                title: 'Error',
                message: error || 'Failed to create API key',
                color: 'red',
            });
        }
    };

    const handleClose = () => {
        // Reset form and state
        setStep('form');
        setCreatedKey(null);
        reset();
        onClose();
    };

    // Don't render if no template provided
    if (!template) return null;

    return (
        <Modal
            opened={opened}
            onClose={handleClose}
            title={step === 'form' ? template.title : 'API Key Created'}
            size="md"
        >
            {step === 'form' ? (
                <TemplateForm
                    template={template}
                    onSubmit={handleSubmit}
                    loading={loading}
                    error={error}
                    validationErrors={validationErrors}
                    onCancel={handleClose}
                />
            ) : (
                <Stack gap="md">
                    {createdKey && (
                        <ApiKeyDisplay
                            apiKey={createdKey.apiKey}
                            label={createdKey.label}
                            dateCreated={createdKey.dateCreated}
                            onClose={handleClose}
                        />
                    )}
                </Stack>
            )}
        </Modal>
    );
}
