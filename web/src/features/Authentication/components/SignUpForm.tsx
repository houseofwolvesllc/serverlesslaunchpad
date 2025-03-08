import {
    TextInput,
    PasswordInput,
    Checkbox,
    Stack,
    Paper,
    Box,
    Center,
    Anchor,
    Button,
    Group,
    rem,
    Image,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { AuthError, useAuth, passwordPolicyValidator, SignInStep } from '../../Authentication';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router-dom';

export const SignUpForm = () => {
    const auth = useAuth();
    const navigate = useNavigate();
    const form = useForm({
        initialValues: {
            firstName: '',
            lastName: '',
            email: '',
            password: '',
            terms: false,
        },
        validate: {
            firstName: (val: string) => (val ? null : 'Please provide a first name'),
            lastName: (val: string) => (val ? null : 'Please provide a last name'),
            email: (val: string) => (/^\S+@\S+$/.test(val) ? null : 'Please provide a valid email'),
            password: passwordPolicyValidator,
            terms: (val: boolean) => (val ? null : 'Please accept terms and conditions'),
        },
    });

    const onSubmit = async (values: typeof form.values) => {
        try {
            const result = await auth.signUp({
                email: values.email,
                password: values.password,
                firstName: values.firstName,
                lastName: values.lastName,
            });

            switch (result) {
                case SignInStep.CONFIRM_SIGNUP:
                    notifications.show({
                        title: 'Sign up code sent',
                        message: 'Please check your email for your sign up code',
                    });

                    navigate(`/auth/confirm-signup?email=${values.email}`);
                    break;
                case SignInStep.SIGNIN:
                    navigate(`/auth/signin`);
                    break;
                default:
                    throw new Error(`Unexpected sign in step: ${result}`);
            }
        } catch (error) {
            if (error instanceof AuthError) {
                switch (error.name) {
                    case 'UsernameExistsException':
                        form.setFieldError('email', 'Email already in use. Sign in or reset yourpassword.');
                        break;
                    default:
                        notifications.show({
                            color: 'red',
                            title: 'Something Unexpected Happened',
                            message: error instanceof Error ? error.message : 'An unexpected error occurred',
                        });
                        throw error;
                }
            } else {
                notifications.show({
                    color: 'red',
                    title: 'Something Unexpected Happened',
                    message: error instanceof Error ? error.message : 'An unexpected error occurred',
                });
                throw error;
            }
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
                    <form id="signup-form" onSubmit={form.onSubmit((values) => onSubmit(values))}>
                        <Stack>
                            <TextInput
                                label="First Name"
                                placeholder="Elon"
                                value={form.values.firstName}
                                onChange={(event) => form.setFieldValue('firstName', event.currentTarget.value)}
                                error={form.errors.firstName}
                                radius="md"
                            />
                            <TextInput
                                label="Last Name"
                                placeholder="Musk"
                                value={form.values.lastName}
                                onChange={(event) => form.setFieldValue('lastName', event.currentTarget.value)}
                                error={form.errors.lastName}
                                radius="md"
                            />
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
                            <Checkbox
                                label="I accept terms and conditions"
                                checked={form.values.terms}
                                onChange={(event) => form.setFieldValue('terms', event.currentTarget.checked)}
                                error={form.errors.terms}
                            />
                        </Stack>
                    </form>
                    <Group justify="space-between" mt="xl">
                        <Anchor
                            component="button"
                            type="button"
                            c="dimmed"
                            onClick={() => {
                                navigate(`/auth/signin`);
                            }}
                            size="xs"
                        >
                            Already have an account? Sign In
                        </Anchor>
                        <Button type="submit" form="signup-form">
                            Sign Up
                        </Button>
                    </Group>
                </Paper>
            </Box>
        </Center>
    );
};
