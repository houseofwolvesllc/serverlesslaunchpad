import { TextInput, Button, Stack, Paper, Text, Center, Box, rem, Image } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useAuth } from '../../Authentication';
import { useNavigate } from 'react-router-dom';

export const ResetPasswordForm = () => {
    const auth = useAuth();
    const navigate = useNavigate();

    const form = useForm({
        initialValues: {
            email: '',
        },
        validate: {
            email: (val) => (/^\S+@\S+$/.test(val) ? null : 'Please provide a valid email to send the reset code to'),
        },
    });

    const onSubmit = async (values: typeof form.values) => {
        try {
            await auth.resetPassword(values.email);
        } catch (error) {
            notifications.show({
                color: 'red',
                title: 'Something Unexpected Happened',
                message: error instanceof Error ? error.message : 'An unexpected error occurred',
            });
            throw error;
        }

        notifications.show({
            title: 'Reset code sent',
            message: 'Please check your email for your reset code',
        });

        navigate(`/auth/confirm-reset-password?email=${values.email}`);
    };

    return (
        <Center h="100vh">
            <Box w={500}>
                <Image
                    src="/svg/serverless_launchpad_logo.svg"
                    alt="Serverless Launchpad Logo"
                    style={{ height: rem(100) }}
                    fit="contain"
                />
                <Paper radius="md" p="xl" withBorder>
                    <Text size="lg" fw={500} mb="md">
                        Reset Your Password
                    </Text>
                    <form id="reset-password-form" onSubmit={form.onSubmit((values) => onSubmit(values))}>
                        <Stack>
                            <TextInput
                                required
                                label="Email"
                                placeholder="your@email.com"
                                value={form.values.email}
                                onChange={(event) => form.setFieldValue('email', event.currentTarget.value)}
                                error={form.errors.email}
                            />
                            <Button type="submit">Reset Password</Button>
                        </Stack>
                    </form>
                </Paper>
            </Box>
        </Center>
    );
};
