/**
 * Help Topic Registry
 *
 * Defines all available help topics with metadata for the Help Center.
 * Each topic has a URL slug, display metadata, icon, and content component.
 */

import type { ComponentType } from 'react';
import type { Icon } from '@tabler/icons-react';
import { IconBook, IconKey, IconShield, IconShieldCheck, IconHelpCircle } from '@tabler/icons-react';
import { GettingStartedContent } from './topics/getting_started';
import { ApiKeysContent } from './topics/api_keys';
import { SessionsSecurityContent } from './topics/sessions_security';
import { AdminContent } from './topics/admin';
import { FaqContent } from './topics/faq';

/**
 * Help topic definition
 */
export interface HelpTopic {
    /** URL slug (e.g., "getting-started") */
    id: string;
    /** Card title */
    title: string;
    /** Card description */
    description: string;
    /** Card icon */
    icon: Icon;
    /** Detail page content component */
    component: ComponentType;
}

/**
 * Registry of all help topics
 *
 * Add new topics here as the application evolves. Each topic appears
 * as a card on the Help Center page and has a dedicated detail page.
 */
export const helpTopics: HelpTopic[] = [
    {
        id: 'getting-started',
        title: 'Getting Started',
        description: 'Learn the basics of Serverless Launchpad and get up and running quickly.',
        icon: IconBook,
        component: GettingStartedContent,
    },
    {
        id: 'api-keys',
        title: 'API Keys',
        description: 'Understand how to create, manage, and use API keys for programmatic access.',
        icon: IconKey,
        component: ApiKeysContent,
    },
    {
        id: 'sessions-security',
        title: 'Sessions & Security',
        description: 'Learn about session management, security best practices, and account protection.',
        icon: IconShield,
        component: SessionsSecurityContent,
    },
    {
        id: 'admin',
        title: 'Admin',
        description: 'Administration tools, user management, and system configuration.',
        icon: IconShieldCheck,
        component: AdminContent,
    },
    {
        id: 'faq',
        title: 'FAQ',
        description: 'Frequently asked questions and common troubleshooting tips.',
        icon: IconHelpCircle,
        component: FaqContent,
    },
];

/**
 * Find a help topic by its URL slug
 *
 * @param id - Topic URL slug
 * @returns The matching HelpTopic, or undefined if not found
 */
export function getHelpTopicById(id: string): HelpTopic | undefined {
    return helpTopics.find((topic) => topic.id === id);
}
