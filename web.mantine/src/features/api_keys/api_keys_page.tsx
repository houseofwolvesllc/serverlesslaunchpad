/**
 * API Keys Page
 *
 * Displays API keys with page header and description.
 * Matches shadcn layout structure.
 */

import { Stack, Title, Text } from '@mantine/core';
import { ApiKeysList } from './components/api_keys_list';
import { useApiKeys } from './hooks/use_api_keys';
import { useHalResourceTracking } from '../../hooks/use_hal_resource_tracking_adapter';

export const ApiKeysPage = () => {
    const { data } = useApiKeys();

    // Track navigation for breadcrumbs
    useHalResourceTracking(data);

    return (
        <Stack gap="lg">
            {/* Page Header */}
            <Stack gap={4}>
                <Title order={1} size="h2">API Keys</Title>
                <Text c="dimmed">
                    Manage your API keys for programmatic access to your resources
                </Text>
            </Stack>

            {/* API Keys List */}
            <ApiKeysList />
        </Stack>
    );
};
