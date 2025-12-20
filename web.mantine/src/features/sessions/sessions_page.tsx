/**
 * Sessions Page
 *
 * Displays user sessions with page header, description, and security information.
 * Matches shadcn layout structure.
 */

import { IconAlertCircle } from '@tabler/icons-react';
import { Stack, Title, Text, Paper, Group } from '@mantine/core';
import { SessionsList } from './components/sessions_list';
import { useSessions } from './hooks/use_sessions';
import { useHalResourceTracking } from '../../hooks/use_hal_resource_tracking_adapter';

export const SessionsPage = () => {
    const { data } = useSessions();

    // Track navigation for breadcrumbs
    useHalResourceTracking(data);

    return (
        <Stack gap="lg">
            {/* Page Header */}
            <Stack gap={4}>
                <Title order={1} size="h2">Sessions</Title>
                <Text c="dimmed">
                    View and manage your active login sessions across all devices
                </Text>
            </Stack>

            {/* Sessions List */}
            <SessionsList />

            {/* Security Information Card */}
            <Paper p="md" withBorder style={{ borderColor: 'var(--mantine-color-blue-light)', backgroundColor: 'var(--mantine-color-blue-light)' }}>
                <Stack gap="sm">
                    <Group gap="xs">
                        <IconAlertCircle size={20} style={{ color: 'var(--mantine-color-blue-filled)' }} />
                        <Text fw={600}>Security Information</Text>
                    </Group>
                    <Text size="sm" c="dimmed">
                        Each session represents a device where you're currently signed in. If you notice any
                        unfamiliar sessions, you should delete them immediately and change your password.
                    </Text>
                    <Text size="sm" c="dimmed">
                        <strong>Note:</strong> You cannot delete your current session. To end your current session,
                        please sign out using the user menu.
                    </Text>
                </Stack>
            </Paper>
        </Stack>
    );
};
