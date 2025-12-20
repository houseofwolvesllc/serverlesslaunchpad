<script lang="ts">
	import { navigationStore } from '$lib/stores/navigation_store';
	import type { SitemapItem } from '$lib/stores/navigation_store';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Home, Settings, Key, Clock, Shield } from 'lucide-svelte';

	// Icon mapper - maps icon names from API to Lucide components
	const iconMap: Record<string, any> = {
		home: Home,
		dashboard: Home,
		settings: Settings,
		key: Key,
		'api-key': Key,
		clock: Clock,
		session: Clock,
		shield: Shield,
		admin: Shield,
	};

	function getIcon(iconName?: string) {
		if (!iconName) return Home;
		const lowerName = iconName.toLowerCase();
		return iconMap[lowerName] || Home;
	}

	function navigate(item: SitemapItem) {
		if (item.path) {
			goto(item.path);
			navigationStore.closeMobile();
		}
	}

	function isActive(path?: string): boolean {
		if (!path) return false;
		return $page.url.pathname === path || $page.url.pathname.startsWith(path + '/');
	}

	$: sitemap = $navigationStore.sitemap;
</script>

<aside class="h-full bg-surface-50-900-token border-r border-surface-300-600-token overflow-y-auto">
	<div class="p-4">
		<!-- Logo / Title -->
		<div class="mb-6">
			<h2 class="h4 font-bold">Serverless Launchpad</h2>
			<p class="text-xs opacity-70">SvelteKit + Skeleton UI</p>
		</div>

		<!-- Navigation Menu -->
		<nav>
			<ul class="menu space-y-1">
				{#each sitemap as item (item.id)}
					{#if item.children && item.children.length > 0}
						<!-- Collapsible Group -->
						<li>
							<details open>
								<summary class="group">
									<svelte:component this={getIcon(item.icon)} size={20} />
									<span>{item.label}</span>
								</summary>
								<ul class="space-y-1">
									{#each item.children as child (child.id)}
										<li>
											<button
												on:click={() => navigate(child)}
												class:active={isActive(child.path)}
												class="gap-2"
											>
												<svelte:component this={getIcon(child.icon)} size={18} />
												<span>{child.label}</span>
											</button>
										</li>
									{/each}
								</ul>
							</details>
						</li>
					{:else}
						<!-- Single Item -->
						<li>
							<button
								on:click={() => navigate(item)}
								class:active={isActive(item.path)}
								class="gap-2"
							>
								<svelte:component this={getIcon(item.icon)} size={20} />
								<span>{item.label}</span>
							</button>
						</li>
					{/if}
				{/each}
			</ul>
		</nav>
	</div>
</aside>

<style>
	.menu li button.active {
		@apply bg-primary text-primary-foreground;
	}

	.menu li button:hover {
		@apply bg-accent text-accent-foreground;
	}

	.menu details summary {
		@apply font-semibold;
	}
</style>
