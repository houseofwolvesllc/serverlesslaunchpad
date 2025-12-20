import { TextInput, PasswordInput, Button, Stack, Paper, Text, Center, Box } from '@mantine/core';
import { useForm } from '@mantine/form';
import { passwordPolicyValidator, useAuth } from '../../Authentication';

export const ConfirmResetPasswordForm = () => {
    const auth = useAuth();

    const form = useForm({
        initialValues: {
            confirmationCode: '',
            newPassword: '',
            confirmNewPassword: '',
        },
        validate: {
            confirmationCode: (val) => (val ? null : 'Confirmation code is required'),
            newPassword: passwordPolicyValidator,
            confirmNewPassword: (val, values) => (val === values.newPassword ? null : 'Passwords do not match'),
        },
    });

    const onSubmit = async (values: typeof form.values) => {
        await auth.confirmResetPassword(values.confirmationCode, values.newPassword);
    };

    return (
        <Center h="100vh">
            <Box w={500}>
                <Paper radius="md" p="xl" withBorder>
                    <Text size="lg" fw={500} mb="md">
                        Reset Your Password
                    </Text>
                    <form id="confirm-reset-password-form" onSubmit={form.onSubmit((values) => onSubmit(values))}>
                        <Stack>
                            <TextInput
                                required
                                label="Confirmation Code"
                                value={form.values.confirmationCode}
                                onChange={(e) => form.setFieldValue('confirmationCode', e.currentTarget.value)}
                                error={form.errors.confirmationCode}
                            />
                            <PasswordInput
                                required
                                label="New Password"
                                value={form.values.newPassword}
                                onChange={(e) => form.setFieldValue('newPassword', e.currentTarget.value)}
                                error={form.errors.newPassword}
                            />
                            <PasswordInput
                                required
                                label="Confirm New Password"
                                value={form.values.confirmNewPassword}
                                onChange={(e) => form.setFieldValue('confirmNewPassword', e.currentTarget.value)}
                                error={form.errors.confirmNewPassword}
                            />
                            <Button type="submit">Reset Password</Button>
                        </Stack>
                    </form>
                </Paper>
            </Box>
        </Center>
    );
};
