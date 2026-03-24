/**
 * Help Topic Detail
 *
 * Wrapper component that resolves the topic from the URL parameter
 * and renders the corresponding content component.
 */

import { useParams, useNavigate } from 'react-router-dom';
import { Button, Stack, Text, Title } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { getHelpTopicById } from './help_topic_registry';

export const HelpTopicDetail = () => {
    const { topicId } = useParams<{ topicId: string }>();
    const navigate = useNavigate();

    const topic = topicId ? getHelpTopicById(topicId) : undefined;

    if (!topic) {
        return (
            <Stack gap="xl">
                <Button
                    variant="subtle"
                    leftSection={<IconArrowLeft size={16} />}
                    onClick={() => navigate('/help')}
                >
                    Back to Help Center
                </Button>
                <Stack align="center" py="xl">
                    <Title order={2}>Topic Not Found</Title>
                    <Text c="dimmed">
                        The help topic you are looking for does not exist.
                    </Text>
                </Stack>
            </Stack>
        );
    }

    const TopicContent = topic.component;

    return (
        <Stack gap="xl">
            <Button
                variant="subtle"
                leftSection={<IconArrowLeft size={16} />}
                onClick={() => navigate('/help')}
            >
                Back to Help Center
            </Button>
            <TopicContent />
        </Stack>
    );
};
