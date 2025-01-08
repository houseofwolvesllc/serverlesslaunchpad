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
import { AuthError, SocialLoginButtons, SignInStep, useAuth } from '../../Authentication';

export const SignInForm = () => {
    const auth = useAuth();

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
            await auth.signIn({ username: values.email, password: values.password });
        } catch (error) {
            console.log('INSTANCE', error instanceof AuthError, typeof error);
            if (error instanceof Error) {
                switch (error.name) {
                    case 'NotAuthorizedException':
                        form.setFieldError(
                            'password',
                            <>
                                Incorrect username or password.{' '}
                                <Anchor
                                    size="xs"
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => auth.setSignInStep(SignInStep.RESET_PASSWORD)}
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
            } else {
                console.error('Unexpected error:', error);
                form.setFieldError('email', 'An unexpected error occurred');
            }
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
                                auth.setSignInStep(SignInStep.SIGNUP);
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
