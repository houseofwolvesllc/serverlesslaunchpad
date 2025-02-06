import {
    Center,
    Box,
    Paper,
    Text,
    Divider,
    Group,
    Anchor,
    Button,
    TextInput,
    PasswordInput,
    Stack,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { AuthError, SignInStep, SocialLoginButtons } from '../../Authentication';
import { useLocation, useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { LoadingContext } from '../../../context/LoadingContext';
import { useAuth } from '../hooks/useAuth';

export const SignInForm = () => {
    const { signIn } = useAuth();
    const { setIsLoading } = useContext(LoadingContext);
    const location = useLocation();
    const navigate = useNavigate();

    const form = useForm({
        initialValues: {
            email: '',
            password: '',
        },
        validate: {
            email: (val) => (/^\S+@\S+$/.test(val) ? null : 'Please provide a valid email'),
            password: (val) => (val ? null : 'Please provide a password'),
        },
    });

    const onSubmit = async (values: typeof form.values) => {
        try {
            setIsLoading(true);

            const result = await signIn({
                username: values.email,
                password: values.password,
            });

            if (!result) {
                throw new Error('Unexpected sign in step');
            }

            switch (result) {
                case SignInStep.CONFIRM_SIGNUP:
                    navigate(`/auth/confirm-signup?username=${values.email}`);
                    break;
                case SignInStep.RESET_PASSWORD:
                    navigate(`/auth/reset-password`);
                    break;
                case SignInStep.COMPLETED:
                    const origin = location.state?.from?.pathname || '/dashboard';
                    navigate(origin);
                    break;
            }
        } catch (error) {
            if (error instanceof AuthError) {
                switch (error.name) {
                    case 'UserNotConfirmedException':
                        navigate(`/auth/confirm-signup?username=${values.email}`);
                        break;
                    case 'PasswordResetRequiredException':
                        navigate(`/auth/reset-password`);
                        break;
                    case 'NotAuthorizedException':
                        form.setFieldError(
                            'password',
                            <>
                                Incorrect username or password.{' '}
                                <Anchor
                                    size="xs"
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => navigate(`/auth/reset-password`)}
                                >
                                    Forgot password?
                                </Anchor>
                            </>
                        );
                        break;
                    case 'UserNotFoundException':
                        form.setFieldError('email', 'User not found');
                        break;
                    default:
                        console.error('Authentication error:', error);
                        form.setFieldError('email', 'An unexpected error occurred');
                }
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Center h="100vh">
            <Box w={500}>
                <Paper radius="md" p="xl" withBorder>
                    <Text size="lg" fw={500}>
                        Welcome, sign in with
                    </Text>

                    <SocialLoginButtons />

                    <Divider label="Or continue with email" labelPosition="center" my="lg" />
                    <form id="signin-form" onSubmit={form.onSubmit((values) => onSubmit(values))}>
                        <Stack>
                            <TextInput
                                required
                                label="Email"
                                placeholder="your@email.com"
                                value={form.values.email}
                                onChange={(event) => form.setFieldValue('email', event.currentTarget.value)}
                                error={form.errors.email}
                                radius="md"
                            />
                            <PasswordInput
                                required
                                label="Password"
                                placeholder="Your password"
                                value={form.values.password}
                                onChange={(event) => form.setFieldValue('password', event.currentTarget.value)}
                                error={form.errors.password}
                                radius="md"
                            />
                        </Stack>
                    </form>
                    <Group justify="space-between" mt="xl">
                        <Anchor
                            component="button"
                            type="button"
                            c="dimmed"
                            onClick={() => {
                                navigate(`/auth/signup`);
                            }}
                            size="xs"
                        >
                            Don't have an account? Sign Up
                        </Anchor>
                        <Button type="submit" form="signin-form">
                            Sign In
                        </Button>
                    </Group>
                </Paper>
            </Box>
        </Center>
    );
};
