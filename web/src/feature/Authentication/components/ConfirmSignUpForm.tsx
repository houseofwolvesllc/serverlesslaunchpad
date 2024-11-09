import { TextInput, Button, Stack, Paper, Text, Center, Box, Group, Anchor } from '@mantine/core';
import { useAuth } from '../../Authentication';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
export const ConfirmSignUpForm = () => {
    const auth = useAuth();

    const form = useForm({
        initialValues: {
            confirmationCode: '',
        },
        validate: {
            confirmationCode: (val: string) => (val ? null : 'Please provide a confirmation code'),
        },
    });

    const onSubmit = async (values: typeof form.values) => {
        await auth.confirmSignUp(values.confirmationCode);

        notifications.show({
            title: 'Confirmed!',
            message: 'Thank you for confirming your account :)',
        });
    };

    const resendSignUpCode = async () => {
        await auth.resendSignUpCode();

        notifications.show({
            title: 'Sign up code resent',
            message: 'Please check your email for the new sign up code',
        });
    };

    return (
        <Center h="100vh">
            <Box w={500}>
                <Paper radius="md" p="xl" withBorder>
                    <Text size="lg" fw={500} mb="md">
                        Confirm Your Sign Up
                    </Text>
                    <form id="confirm-signup-form" onSubmit={form.onSubmit((values) => onSubmit(values))}>
                        <Stack>
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
