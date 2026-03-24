/**
 * Admin Help Topic Content
 */

import { Paper, Text, Title } from '@mantine/core';

export const AdminContent = () => {
    return (
        <Paper shadow="sm" p="lg" radius="md" withBorder>
            <Title order={3} mb="md">
                Admin
            </Title>
            <Text c="dimmed">
                This section is a placeholder. Content will be added as the application evolves.
            </Text>
        </Paper>
    );
};
