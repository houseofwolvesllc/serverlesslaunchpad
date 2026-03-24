<!--
  Help Center Page

  Main landing page for the Help Center feature. Displays a responsive
  card grid of help topics and a Tools & Resources section with quick
  links to API documentation and API key management.
-->

<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { LifeBuoy, BookOpen, Key, Shield, ShieldCheck, HelpCircle, ArrowRight, Code2 } from 'lucide-svelte';
	import { sitemapStore } from '$lib/stores/sitemap_store';
	import webConfigStore from '$lib/config/web_config_store';
	import Card from '$lib/components/ui/card.svelte';
	import CardHeader from '$lib/components/ui/card-header.svelte';
	import CardContent from '$lib/components/ui/card-content.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import { helpTopics } from '$lib/features/help/help_topic_registry';

	let apiBaseUrl = '';

	onMount(async () => {
		const config = await webConfigStore.getConfig();
		apiBaseUrl = config.api.base_url;
	});

	// Resolve API keys href from sitemap
	$: links = $sitemapStore.links;
	$: templates = $sitemapStore.templates;
	$: apiKeysHref = links?.['api-keys']?.href || templates?.['api-keys']?.target || null;

	/**
	 * Render the icon component for a given icon identifier.
	 * Icons are handled inline rather than through a centralized mapper.
	 */
	const iconMap = {
		'book-open': BookOpen,
		'key': Key,
		'shield': Shield,
		'shield-check': ShieldCheck,
		'help-circle': HelpCircle
	} as const;
</script>

<div class="space-y-8">
	<!-- Page Header -->
	<div class="space-y-2">
		<div class="flex items-center gap-3">
			<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
				<LifeBuoy class="h-5 w-5 text-primary" />
			</div>
			<h1 class="text-3xl font-bold tracking-tight">Help Center</h1>
		</div>
		<p class="text-muted-foreground">
			Find guides, references, and answers to common questions.
		</p>
	</div>

	<!-- Topic Cards Grid -->
	<div class="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
		{#each helpTopics as topic (topic.id)}
			{@const Icon = iconMap[topic.icon]}
			<Card class="hover:shadow-md transition-shadow cursor-pointer" on:click={() => goto(`/help/${topic.id}`)}>
				<CardHeader>
					<div class="flex items-center gap-3">
						<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
							<Icon class="h-5 w-5 text-primary" />
						</div>
						<h3 class="text-lg font-semibold">
							{topic.title}
						</h3>
					</div>
				</CardHeader>
				<CardContent>
					<p class="text-sm text-muted-foreground">{topic.description}</p>
				</CardContent>
			</Card>
		{/each}
	</div>

	<!-- Tools & Resources -->
	<div>
		<h2 class="text-2xl font-semibold tracking-tight mb-4">Tools & Resources</h2>
		<div class="grid gap-4 md:grid-cols-2">
			{#if apiBaseUrl}
				<Card class="hover:shadow-md transition-shadow">
					<CardHeader>
						<div class="flex items-center gap-3">
							<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
								<Code2 class="h-5 w-5 text-primary" />
							</div>
							<h3 class="text-lg font-semibold">API Documentation</h3>
						</div>
					</CardHeader>
					<CardContent class="space-y-3">
						<p class="text-sm text-muted-foreground">
							Explore the hypermedia API, endpoints, and response formats.
						</p>
						<Button
							class="w-full"
							variant="outline"
							on:click={() => window.open(apiBaseUrl, '_blank', 'noopener,noreferrer')}
						>
							Open API Documentation
							<ArrowRight class="ml-2 h-4 w-4" />
						</Button>
					</CardContent>
				</Card>
			{/if}

			<Card class="hover:shadow-md transition-shadow">
				<CardHeader>
					<div class="flex items-center gap-3">
						<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
							<Key class="h-5 w-5 text-primary" />
						</div>
						<h3 class="text-lg font-semibold">API Keys</h3>
					</div>
				</CardHeader>
				<CardContent class="space-y-3">
					<p class="text-sm text-muted-foreground">
						Create and manage API keys for programmatic access to your resources.
					</p>
					<Button
						class="w-full"
						variant="outline"
						disabled={!apiKeysHref}
						on:click={() => apiKeysHref && goto(apiKeysHref)}
					>
						Manage API Keys
						<ArrowRight class="ml-2 h-4 w-4" />
					</Button>
				</CardContent>
			</Card>
		</div>
	</div>
</div>
