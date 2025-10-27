import { useState } from 'react';
import { Button, Group, Modal, Stack, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useApiKeys } from '../hooks/use_api_keys';
import { ApiKeyDisplay } from './api_key_display';

/**
 * Props for CreateApiKeyModal component
 */
interface CreateApiKeyModalProps {
    /** Whether the modal is open */
    opened: boolean;
    /** Callback when modal should close */
    onClose: () => void;
}

/**
 * Form values for API key creation
 */
interface CreateApiKeyForm {
    label: string;
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
 * Create API Key Modal Component
 *
 * Two-state modal that allows users to create new API keys:
 * 1. Form View: Input label
 * 2. Success View: Display the newly created API key (one-time only)
 *
 * Features:
 * - Form validation (label required, 1-255 chars)
 * - Loading states during creation
 * - Error handling with user-friendly messages
 * - One-time display of full API key with copy functionality
 *
 * @example
 * ```tsx
 * const [opened, { open, close }] = useDisclosure(false);
 *
 * <CreateApiKeyModal opened={opened} onClose={close} />
 * ```
 */
export function CreateApiKeyModal({ opened, onClose }: CreateApiKeyModalProps) {
    const [step, setStep] = useState<'form' | 'success'>('form');
    const [createdKey, setCreatedKey] = useState<CreatedApiKey | null>(null);
    const [loading, setLoading] = useState(false);
    const { createApiKey } = useApiKeys();

    const form = useForm<CreateApiKeyForm>({
        initialValues: {
            label: '',
        },
        validate: {
            label: (value) => {
                if (!value || value.length < 1) {
                    return 'Label is required';
                }
                if (value.length > 255) {
                    return 'Label too long (max 255 characters)';
                }
                return null;
            },
        },
    });

    const handleSubmit = async (values: CreateApiKeyForm) => {
        setLoading(true);

        const result = await createApiKey(values.label);

        setLoading(false);

        if (result.success && result.data) {
            setCreatedKey(result.data);
            setStep('success');
        } else {
            notifications.show({
                title: 'Error',
                message: result.error || 'Failed to create API key',
                color: 'red',
            });
        }
    };

    const handleClose = () => {
        // Reset form and state
        setStep('form');
        setCreatedKey(null);
        form.reset();
        onClose();
    };

    return (
        <Modal
            opened={opened}
            onClose={handleClose}
            title={step === 'form' ? 'Create API Key' : 'API Key Created'}
            size="md"
            closeOnClickOutside={step === 'form'} // Prevent accidental close in success view
        >
            {step === 'form' ? (
                <form onSubmit={form.onSubmit(handleSubmit)}>
                    <Stack gap="md">
                        <TextInput
                            label="Label"
                            placeholder="Production API Key"
                            required
                            disabled={loading}
                            {...form.getInputProps('label')}
                        />

                        <Group justify="flex-end" mt="md">
                            <Button variant="subtle" onClick={handleClose} disabled={loading}>
                                Cancel
                            </Button>
                            <Button type="submit" loading={loading}>
                                Create
                            </Button>
                        </Group>
                    </Stack>
                </form>
            ) : (
                createdKey && (
                    <ApiKeyDisplay
                        apiKey={createdKey.apiKey}
                        label={createdKey.label}
                        dateCreated={createdKey.dateCreated}
                        onClose={handleClose}
                    />
                )
            )}
        </Modal>
    );
}
