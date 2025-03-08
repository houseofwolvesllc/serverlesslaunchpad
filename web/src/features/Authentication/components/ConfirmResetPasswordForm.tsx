import {
    TextInput,
    PasswordInput,
    Button,
    Stack,
    Paper,
    Text,
    Center,
    Box,
    Input,
    Anchor,
    rem,
    Image,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AuthError, passwordPolicyValidator, useAuth } from '../../Authentication';
import { notifications } from '@mantine/notifications';

export const ConfirmResetPasswordForm = () => {
    const auth = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const confirmationEmail = (searchParams.get('email') || '').trim().replace(/\s/g, '+');

    const form = useForm({
        initialValues: {
            confirmationEmail: confirmationEmail,
            confirmationCode: '',
            newPassword: '',
            confirmNewPassword: '',
        },
        validate: {
            confirmationEmail: (val) => (val ? null : 'Confirmation email is required'),
            confirmationCode: (val) => (val ? null : 'Confirmation code is required'),
            newPassword: passwordPolicyValidator,
            confirmNewPassword: (val, values) => (val === values.newPassword ? null : 'Passwords do not match'),
        },
    });

    const onSubmit = async (values: typeof form.values) => {
        try {
            await auth.confirmResetPassword(values.confirmationEmail, values.confirmationCode, values.newPassword);

            notifications.show({
                title: 'Password reset successful',
                message: 'Your password has been reset. Please sign in to continue.',
            });

            navigate('/auth/signin');
        } catch (error) {
            if (error instanceof AuthError) {
                switch (error.name) {
                    case 'ExpiredCodeException':
                        form.setFieldError(
                            'confirmationCode',
                            <>
                                Confirmation code has expired.{' '}
                                <Anchor
                                    size="xs"
                                    style={{ cursor: 'pointer' }}
                                    onClick={async () => {
                                        await auth.resetPassword(values.confirmationEmail);

                                        notifications.show({
                                            title: 'Reset code resent',
                                            message: 'Please check your email for your reset code',
                                        });
                                    }}
                                >
                                    Resend code?
                                </Anchor>
                            </>
                        );
                        return;
                    case 'InvalidPasswordException':
                        form.setFieldError('newPassword', 'Invalid password');
                        return;
                    case 'LimitExceededException':
                        form.setFieldError('confirmationCode', 'Too many attempts. Please try again later.');
                        return;
                    default:
                        notifications.show({
                            color: 'red',
                            title: 'Something Unexpected Happened',
                            message: error instanceof Error ? error.message : 'An unexpected error occurred',
                        });
                        throw error;
                }
            }

            console.error('FORM Unexpected error:', error);
            throw error;
        }
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
                    <form id="confirm-reset-password-form" onSubmit={form.onSubmit((values) => onSubmit(values))}>
                        <Stack>
                            <Input type="hidden" {...form.getInputProps('confirmationEmail')} />
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
