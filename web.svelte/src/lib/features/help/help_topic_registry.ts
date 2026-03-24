/**
 * Help Topic Registry
 *
 * Defines all available help topics with metadata for the Help Center.
 * Each topic has a URL slug, display metadata, and icon name for inline rendering.
 */

import type { ComponentType, SvelteComponent } from 'svelte';

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
	/** Icon identifier for inline rendering */
	icon: 'book-open' | 'key' | 'shield' | 'shield-check' | 'help-circle';
	/** Lazy loader for detail page content component */
	load: () => Promise<{ default: ComponentType<SvelteComponent> }>;
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
		icon: 'book-open',
		load: () => import('./topics/getting_started.svelte')
	},
	{
		id: 'api-keys',
		title: 'API Keys',
		description: 'Understand how to create, manage, and use API keys for programmatic access.',
		icon: 'key',
		load: () => import('./topics/api_keys.svelte')
	},
	{
		id: 'sessions-security',
		title: 'Sessions & Security',
		description:
			'Learn about session management, security best practices, and account protection.',
		icon: 'shield',
		load: () => import('./topics/sessions_security.svelte')
	},
	{
		id: 'admin',
		title: 'Admin',
		description: 'Administration tools, user management, and system configuration.',
		icon: 'shield-check',
		load: () => import('./topics/admin.svelte')
	},
	{
		id: 'faq',
		title: 'FAQ',
		description: 'Frequently asked questions and common troubleshooting tips.',
		icon: 'help-circle',
		load: () => import('./topics/faq.svelte')
	}
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
