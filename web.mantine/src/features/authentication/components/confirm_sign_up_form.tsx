import { TextInput, Button, Stack, Paper, Text, Center, Box, Group, Anchor, Input, rem, Divider } from '@mantine/core';
import { useAuth } from '../../authentication';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useSearchParams, useNavigate } from 'react-router-dom';

export const ConfirmSignUpForm = () => {
    const auth = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const confirmationEmail = (searchParams.get('email') || '').trim().replace(/\s/g, '+');

    const form = useForm({
        initialValues: {
            confirmationEmail: confirmationEmail || '',
            confirmationCode: '',
        },
        validate: {
            confirmationEmail: (val: string) => (val ? null : 'Please provide the email address you signed up with'),
            confirmationCode: (val: string) => (val ? null : 'Please provide a confirmation code'),
        },
    });

    const onSubmit = async (values: typeof form.values) => {
        try {
            await auth.confirmSignUp({
                confirmationEmail: values.confirmationEmail,
                confirmationCode: values.confirmationCode,
            });
        } catch (error) {
            notifications.show({
                color: 'red',
                title: 'Something Unexpected Happened',
                message: error instanceof Error ? error.message : 'An unexpected error occurred',
            });
            throw error;
        }

        notifications.show({
            title: 'Confirmed!',
            message: 'Thank you for confirming your account :)',
        });

        navigate('/');
    };

    const resendSignUpCode = async () => {
        try {
            await auth.resendConfirmationCode(form.values.confirmationEmail);
        } catch (error) {
            notifications.show({
                color: 'red',
                title: 'Something Unexpected Happened',
                message: error instanceof Error ? error.message : 'An unexpected error occurred',
            });
            throw error;
        }

        notifications.show({
            title: 'Sign up code resent',
            message: 'Please check your email for the new sign up code',
        });
    };

    return (
        <Center h="100vh">
            <Box w={500}>
                <Paper radius="md" p="xl" withBorder>
                    <Group justify="center" mb="md">
                        <Group gap="sm">
                            <Box
                                style={{
                                    height: rem(48),
                                    width: rem(48),
                                    borderRadius: rem(8),
                                    backgroundColor: 'var(--mantine-color-blue-light)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Text c="blue" fw={700} size="xl">SL</Text>
                            </Box>
                            <Stack gap={0}>
                                <Text fw={600} size="lg">Serverless Launchpad</Text>
                                <Text c="dimmed" size="sm">Mantine Edition</Text>
                            </Stack>
                        </Group>
                    </Group>
                    <Divider mb="md" />
                    <Text size="lg" fw={500} mb="md">
                        Confirm Your Sign Up
                    </Text>
                    <form id="confirm-signup-form" onSubmit={form.onSubmit((values) => onSubmit(values))}>
                        <Stack>
                            <Input type="hidden" {...form.getInputProps('confirmationEmail')} />
                            <TextInput
                                required
                                label="Confirmation Code"
                                value={form.values.confirmationCode}
                                onChange={(event) => form.setFieldValue('confirmationCode', event.currentTarget.value)}
                                error={form.errors.confirmationCode}
                            />
                        </Stack>
                    </form>
                    <Group justify="space-between" mt="xl">
                        <Anchor
                            component="button"
                            type="button"
                            c="dimmed"
                            onClick={() => {
                                resendSignUpCode();
                            }}
                            size="xs"
                        >
                            Resend Confirmation Code
                        </Anchor>
                        <Button type="submit" form="confirm-signup-form">
                            Confirm
                        </Button>
                    </Group>
                </Paper>
            </Box>
        </Center>
    );
};
