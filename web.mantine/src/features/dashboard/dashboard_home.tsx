/**
 * Dashboard Home Component
 *
 * Default landing page showing personalized greeting, quick actions, and account info.
 * Matches the UX of shadcn dashboard.
 */

import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Title, Text, Paper, Stack, Button, SimpleGrid, Group, ThemeIcon, rem } from '@mantine/core';
import { IconClock, IconKey, IconLogout, IconArrowRight } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useAuth } from '../authentication/hooks/use_auth';
import { AuthenticationContext } from '../authentication/context/authentication_context';
import { useSitemap } from '../sitemap/hooks/use_sitemap';

export const DashboardHome = () => {
    const navigate = useNavigate();
    const { signOut } = useAuth();
    const { signedInUser } = useContext(AuthenticationContext);
    const { links, templates } = useSitemap();

    const username = signedInUser?.username || signedInUser?.email || 'User';
    const first_name = signedInUser?.firstName;

    // Resolve link/template href by rel
    const getHref = (rel: string): string | null => {
        // Check links first
        if (links && links[rel]) {
            return links[rel].href;
        }
        // Check templates
        if (templates && templates[rel]) {
            return templates[rel].target;
        }
        return null;
    };

    const sessions_href = getHref('sessions');
    const api_keys_href = getHref('api-keys');

    // Greeting based on time of day
    const get_greeting = (): string => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    };

    const handle_logout = async () => {
        try {
            await signOut();
            notifications.show({
                title: 'Success',
                message: 'Logged out successfully',
                color: 'green',
            });
            navigate('/auth/signin');
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: 'Failed to logout',
                color: 'red',
            });
        }
    };

    return (
        <Container size="lg" py="xl">
            <Stack gap="xl">
                {/* Welcome Header */}
                <Stack gap="xs">
                    <Title order={1} size={rem(36)}>
                        {get_greeting()}{first_name ? `, ${first_name}` : ''}!
                    </Title>
                    <Text size="lg" c="dimmed">
                        Welcome to your dashboard. Here's an overview of your account.
                    </Text>
                </Stack>

                {/* Quick Actions */}
                <Stack gap="md">
                    <Title order={2} size={rem(24)}>Quick Actions</Title>
                    <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing="md">
                        <Paper shadow="sm" p="lg" radius="md" withBorder style={{ cursor: 'pointer' }}>
                            <Stack gap="md">
                                <Group gap="md">
                                    <ThemeIcon size="lg" radius="md" variant="light">
                                        <IconClock size={20} />
                                    </ThemeIcon>
                                    <Text fw={600}>Manage Sessions</Text>
                                </Group>
                                <Text size="sm" c="dimmed">
                                    View and manage your active login sessions across devices.
                                </Text>
                                <Button
                                    fullWidth
                                    onClick={() => sessions_href && navigate(sessions_href)}
                                    disabled={!sessions_href}
                                    rightSection={<IconArrowRight size={16} />}
                                >
                                    Manage Sessions
                                </Button>
                            </Stack>
                        </Paper>

                        <Paper shadow="sm" p="lg" radius="md" withBorder style={{ cursor: 'pointer' }}>
                            <Stack gap="md">
                                <Group gap="md">
                                    <ThemeIcon size="lg" radius="md" variant="light">
                                        <IconKey size={20} />
                                    </ThemeIcon>
                                    <Text fw={600}>Manage API Keys</Text>
                                </Group>
                                <Text size="sm" c="dimmed">
                                    Generate and manage API keys for programmatic access.
                                </Text>
                                <Button
                                    fullWidth
                                    onClick={() => api_keys_href && navigate(api_keys_href)}
                                    disabled={!api_keys_href}
                                    rightSection={<IconArrowRight size={16} />}
                                >
                                    Manage API Keys
                                </Button>
                            </Stack>
                        </Paper>

                        <Paper shadow="sm" p="lg" radius="md" withBorder style={{ cursor: 'pointer' }}>
                            <Stack gap="md">
                                <Group gap="md">
                                    <ThemeIcon size="lg" radius="md" variant="light" color="red">
                                        <IconLogout size={20} />
                                    </ThemeIcon>
                                    <Text fw={600}>Logout</Text>
                                </Group>
                                <Text size="sm" c="dimmed">
                                    Sign out of your account and end your current session.
                                </Text>
                                <Button
                                    fullWidth
                                    color="red"
                                    onClick={handle_logout}
                                    rightSection={<IconArrowRight size={16} />}
                                >
                                    Logout
                                </Button>
                            </Stack>
                        </Paper>
                    </SimpleGrid>
                </Stack>

                {/* Account Information */}
                <Paper shadow="sm" p="lg" radius="md" withBorder>
                    <Stack gap="md">
                        <Title order={2} size={rem(24)}>Account Information</Title>
                        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="xl">
                            <Stack gap="xs">
                                <Text size="sm" fw={500} c="dimmed">Username</Text>
                                <Text size="md" fw={600}>{username}</Text>
                            </Stack>
                            <Stack gap="xs">
                                <Text size="sm" fw={500} c="dimmed">Email Address</Text>
                                <Text size="md" fw={600}>{signedInUser?.email}</Text>
                            </Stack>
                            <Stack gap="xs">
                                <Text size="sm" fw={500} c="dimmed">Account Type</Text>
                                <Text size="md" fw={600}>Standard</Text>
                            </Stack>
                        </SimpleGrid>
                    </Stack>
                </Paper>
            </Stack>
        </Container>
    );
};
