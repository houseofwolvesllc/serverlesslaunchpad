/**
 * Help Topic Detail
 *
 * Wrapper component that resolves the topic from the URL parameter
 * and renders the corresponding content component.
 */

import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getHelpTopicById } from './help_topic_registry';

export const HelpTopicDetail = () => {
    const { topicId } = useParams<{ topicId: string }>();
    const navigate = useNavigate();

    const topic = topicId ? getHelpTopicById(topicId) : undefined;

    if (!topic) {
        return (
            <div className="space-y-6">
                <Button variant="ghost" onClick={() => navigate('/help')} className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Help Center
                </Button>
                <div className="text-center py-12">
                    <h2 className="text-2xl font-semibold tracking-tight">Topic Not Found</h2>
                    <p className="text-muted-foreground mt-2">
                        The help topic you are looking for does not exist.
                    </p>
                </div>
            </div>
        );
    }

    const TopicContent = topic.component;

    return (
        <div className="space-y-6">
            <Button variant="ghost" onClick={() => navigate('/help')} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Help Center
            </Button>
            <TopicContent />
        </div>
    );
};
