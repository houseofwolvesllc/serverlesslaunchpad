import { useState } from 'react';
import { HalTemplate } from '@houseofwolves/serverlesslaunchpad.types/hal';
import { toast } from 'sonner';
import { AlertCircle } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TemplateForm } from '../../../components/hal_forms/template_form';
import { useExecuteTemplate } from '../../../hooks/use_hal_resource';
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
                toast.success('API key created successfully');
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
            toast.error(error || 'Failed to create API key');
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
        <Dialog open={opened} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {step === 'form' ? template.title : 'API Key Created'}
                    </DialogTitle>
                    <DialogDescription>
                        {step === 'form'
                            ? 'Create a new API key for programmatic access to your account.'
                            : 'Your API key has been created successfully. Copy it now as it will not be shown again.'}
                    </DialogDescription>
                </DialogHeader>
                {step === 'form' ? (
                    <TemplateForm
                        template={template}
                        onSubmit={handleSubmit}
                        loading={loading}
                        error={error}
                        validationErrors={validationErrors}
                        onCancel={handleClose}
                        hideTitle={true}
                    />
                ) : (
                    <div className="flex flex-col space-y-4">
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Success</AlertTitle>
                            <AlertDescription>
                                Your API key has been created. You can copy it now or access it
                                anytime from the API keys list. Keep your API keys secure and
                                never share them publicly.
                            </AlertDescription>
                        </Alert>
                        {createdKey && (
                            <ApiKeyDisplay
                                apiKey={createdKey.apiKey}
                                label={createdKey.label}
                                dateCreated={createdKey.dateCreated}
                                onClose={handleClose}
                            />
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
