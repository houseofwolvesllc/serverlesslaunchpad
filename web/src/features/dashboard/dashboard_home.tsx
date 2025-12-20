/**
 * Dashboard Home Component
 *
 * Default landing page for the dashboard when no specific route is selected.
 * Displays a welcome message and basic information about the application.
 */

import { Container, Title, Text, Paper, Stack } from '@mantine/core';

export const DashboardHome = () => {
    return (
        <Container size="lg" py="xl">
            <Stack gap="lg">
                <Paper shadow="sm" p="xl" radius="md">
                    <Stack gap="md">
                        <Title order={1}>Welcome to Serverless Launchpad</Title>
                        <Text size="lg" c="dimmed">
                            Get started by selecting an option from the navigation menu.
                        </Text>
                    </Stack>
                </Paper>
            </Stack>
        </Container>
    );
};
