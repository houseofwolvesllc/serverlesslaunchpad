import { TextInput, Button, Stack, Paper, Text, Center, Box } from '@mantine/core';
import { useForm } from '@mantine/form';
import { SignInStep, useAuth } from '../../Authentication';

export const ResetPasswordForm = () => {
    const auth = useAuth();

    const form = useForm({
        initialValues: {
            email: '',
        },
        validate: {
            email: (val) => (/^\S+@\S+$/.test(val) ? null : 'Please provide a valid email to send the reset code to'),
        },
    });

    const onSubmit = async (values: typeof form.values) => {
        await auth.resetPassword(values.email);
        auth.setSignInStep(SignInStep.CONFIRM_RESET_PASSWORD); // TODO: move this to the authentication provider
    };

    return (
        <Center h="100vh">
            <Box w={500}>
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
