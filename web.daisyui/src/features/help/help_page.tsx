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
                <p className="text-base-content/70">
                    Find guides, references, and answers to common questions.
                </p>
            </div>

            {/* Topic Cards Grid */}
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {helpTopics.map((topic) => {
                    const Icon = topic.icon;
                    return (
                        <div
                            key={topic.id}
                            className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer"
                            onClick={() => navigate(`/help/${topic.id}`)}
                        >
                            <div className="card-body">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                        <Icon className="h-5 w-5 text-primary" />
                                    </div>
                                    <h2 className="card-title text-lg">{topic.title}</h2>
                                </div>
                                <p className="text-base-content/70 mt-2">{topic.description}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Tools & Resources */}
            <div>
                <h2 className="text-2xl font-semibold tracking-tight mb-4">Tools & Resources</h2>
                <div className="grid gap-4 md:grid-cols-2">
                    {apiBaseUrl && (
                        <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
                            <div className="card-body">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                        <Code2 className="h-5 w-5 text-primary" />
                                    </div>
                                    <h3 className="card-title text-lg">API Documentation</h3>
                                </div>
                                <p className="text-base-content/70 mt-2">
                                    Explore the hypermedia API, endpoints, and response formats.
                                </p>
                                <div className="card-actions mt-3">
                                    <button
                                        className="btn btn-outline w-full"
                                        onClick={() => window.open(apiBaseUrl, '_blank', 'noopener,noreferrer')}
                                    >
                                        Open API Documentation
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
                        <div className="card-body">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                    <Key className="h-5 w-5 text-primary" />
                                </div>
                                <h3 className="card-title text-lg">API Keys</h3>
                            </div>
                            <p className="text-base-content/70 mt-2">
                                Create and manage API keys for programmatic access to your resources.
                            </p>
                            <div className="card-actions mt-3">
                                <button
                                    className="btn btn-outline w-full"
                                    onClick={() => apiKeysHref && navigate(apiKeysHref)}
                                    disabled={!apiKeysHref}
                                >
                                    Manage API Keys
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
