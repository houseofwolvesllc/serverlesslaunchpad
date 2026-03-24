/**
 * Help Center Page
 *
 * Main landing page for the Help Center feature. Displays a responsive
 * card grid of help topics and a Tools & Resources section with quick
 * links to API documentation and API key management.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Code2, Key, LifeBuoy } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
        <div className="space-y-8">
            {/* Page Header */}
            <div className="space-y-2">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <LifeBuoy className="h-5 w-5 text-primary" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">Help Center</h1>
                </div>
                <p className="text-muted-foreground">
                    Find guides, references, and answers to common questions.
                </p>
            </div>

            {/* Topic Cards Grid */}
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {helpTopics.map((topic) => {
                    const Icon = topic.icon;
                    return (
                        <Card
                            key={topic.id}
                            className="hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => navigate(`/help/${topic.id}`)}
                        >
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                        <Icon className="h-5 w-5 text-primary" />
                                    </div>
                                    <CardTitle className="text-lg">{topic.title}</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <CardDescription>{topic.description}</CardDescription>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Tools & Resources */}
            <div>
                <h2 className="text-2xl font-semibold tracking-tight mb-4">Tools & Resources</h2>
                <div className="grid gap-4 md:grid-cols-2">
                    {apiBaseUrl && (
                        <Card className="hover:shadow-md transition-shadow">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                        <Code2 className="h-5 w-5 text-primary" />
                                    </div>
                                    <CardTitle className="text-lg">API Documentation</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <CardDescription>
                                    Explore the hypermedia API, endpoints, and response formats.
                                </CardDescription>
                                <Button
                                    className="w-full"
                                    variant="outline"
                                    onClick={() => window.open(apiBaseUrl, '_blank', 'noopener,noreferrer')}
                                >
                                    Open API Documentation
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    <Card className="hover:shadow-md transition-shadow">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                    <Key className="h-5 w-5 text-primary" />
                                </div>
                                <CardTitle className="text-lg">API Keys</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <CardDescription>
                                Create and manage API keys for programmatic access to your resources.
                            </CardDescription>
                            <Button
                                className="w-full"
                                variant="outline"
                                onClick={() => apiKeysHref && navigate(apiKeysHref)}
                                disabled={!apiKeysHref}
                            >
                                Manage API Keys
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};
