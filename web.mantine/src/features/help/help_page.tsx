/**
 * Help Center Page
 *
 * Main landing page for the Help Center feature. Displays a responsive
 * card grid of help topics and a Tools & Resources section with quick
 * links to API documentation and API key management.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Group, Paper, SimpleGrid, Stack, Text, ThemeIcon, Title, rem } from '@mantine/core';
import { IconArrowRight, IconCode, IconHelpCircle, IconKey } from '@tabler/icons-react';
import WebConfigurationStore from '@/configuration/web_config_store';
import { helpTopics } from './help_topic_registry';
import { useSitemap } from '../sitemap/hooks/use_sitemap';

export const HelpPage = () => {
    const navigate = useNavigate();
    const [apiBaseUrl, setApiBaseUrl] = useState<string>('');
    const { links, templates } = useSitemap();

    useEffect(() => {
        WebConfigurationStore.getConfig().then((config) => {
            setApiBaseUrl(config.api.base_url);
        });
    }, []);

    // Resolve API keys href from sitemap
    const apiKeysHref = (() => {
        if (links && links['api-keys']) return links['api-keys'].href;
        if (templates && templates['api-keys']) return templates['api-keys'].target;
        return null;
    })();

    return (
        <Stack gap="xl">
            {/* Page Header */}
            <Stack gap="xs">
                <Group gap="md">
                    <ThemeIcon size="xl" radius="md" variant="light">
                        <IconHelpCircle size={24} />
                    </ThemeIcon>
                    <Title order={1}>Help Center</Title>
                </Group>
                <Text c="dimmed">
                    Find guides, references, and answers to common questions.
                </Text>
            </Stack>

            {/* Topic Cards Grid */}
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                {helpTopics.map((topic) => {
                    const TopicIcon = topic.icon;
                    return (
                        <Paper
                            key={topic.id}
                            shadow="sm"
                            p="lg"
                            radius="md"
                            withBorder
                            style={{ cursor: 'pointer' }}
                            onClick={() => navigate(`/help/${topic.id}`)}
                        >
                            <Stack gap="md">
                                <Group gap="md">
                                    <ThemeIcon size="lg" radius="md" variant="light">
                                        <TopicIcon size={20} />
                                    </ThemeIcon>
                                    <Text fw={600} size="lg">
                                        {topic.title}
                                    </Text>
                                </Group>
                                <Text size="sm" c="dimmed">
                                    {topic.description}
                                </Text>
                            </Stack>
                        </Paper>
                    );
                })}
            </SimpleGrid>

            {/* Tools & Resources */}
            <Stack gap="md">
                <Title order={2} size={rem(24)}>
                    Tools & Resources
                </Title>
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                    {apiBaseUrl && (
                        <Paper shadow="sm" p="lg" radius="md" withBorder>
                            <Stack gap="md">
                                <Group gap="md">
                                    <ThemeIcon size="lg" radius="md" variant="light">
                                        <IconCode size={20} />
                                    </ThemeIcon>
                                    <Text fw={600} size="lg">
                                        API Documentation
                                    </Text>
                                </Group>
                                <Text size="sm" c="dimmed">
                                    Explore the hypermedia API, endpoints, and response formats.
                                </Text>
                                <Button
                                    fullWidth
                                    variant="outline"
                                    rightSection={<IconArrowRight size={16} />}
                                    onClick={() => window.open(apiBaseUrl, '_blank', 'noopener,noreferrer')}
                                >
                                    Open API Documentation
                                </Button>
                            </Stack>
                        </Paper>
                    )}

                    <Paper shadow="sm" p="lg" radius="md" withBorder>
                        <Stack gap="md">
                            <Group gap="md">
                                <ThemeIcon size="lg" radius="md" variant="light">
                                    <IconKey size={20} />
                                </ThemeIcon>
                                <Text fw={600} size="lg">
                                    API Keys
                                </Text>
                            </Group>
                            <Text size="sm" c="dimmed">
                                Create and manage API keys for programmatic access to your resources.
                            </Text>
                            <Button
                                fullWidth
                                variant="outline"
                                rightSection={<IconArrowRight size={16} />}
                                onClick={() => apiKeysHref && navigate(apiKeysHref)}
                                disabled={!apiKeysHref}
                            >
                                Manage API Keys
                            </Button>
                        </Stack>
                    </Paper>
                </SimpleGrid>
            </Stack>
        </Stack>
    );
};
