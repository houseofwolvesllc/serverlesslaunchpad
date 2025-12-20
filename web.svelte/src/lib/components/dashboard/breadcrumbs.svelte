<script lang="ts">
	import { goto } from '$app/navigation';
	import { get } from 'svelte/store';
	import { ChevronRight, Home } from 'lucide-svelte';
	import { cn } from '$lib/utils';
	import { breadcrumbsStore } from '$lib/stores/breadcrumbs_store';
	import { navigationHistoryStore } from '$lib/stores/navigation_history_store';
	import { getHref } from '$lib/utils/hal_helpers';

	let className: string | undefined = undefined;
	export { className as class };

	function handleBreadcrumbClick(href: string | null) {
		if (!href) return;

		// Get current history
		const navHistory = get(navigationHistoryStore);

		// Find this href in the history array
		const historyIndex = navHistory.history.findIndex((item) => {
			const itemHref = getHref(item.resource._links?.self);
			return itemHref === href;
		});

		if (historyIndex >= 0) {
			// Found in history - truncate to this point
			navigationHistoryStore.truncateHistory(historyIndex);

			// Mark next navigation to skip tracking (avoid duplicate)
			navigationHistoryStore.markNextNavigationSkip();

			// Navigate
			goto(href);
		} else {
			// Not in history (Dashboard or group) - just navigate
			goto(href);
		}
	}
</script>

<nav aria-label="Breadcrumb" class={cn('flex items-center space-x-2 text-sm', className)}>
	{#each $breadcrumbsStore as crumb, index}
		{#if index > 0}
			<ChevronRight class="h-4 w-4 text-muted-foreground" />
		{/if}

		{#if crumb.isLast || !crumb.href}
			<span class="font-medium text-foreground flex items-center gap-1.5">
				{#if index === 0}
					<Home class="h-4 w-4" />
				{/if}
				{crumb.label}
			</span>
		{:else}
			<button
				type="button"
				on:click={() => handleBreadcrumbClick(crumb.href)}
				class="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
			>
				{#if index === 0}
					<Home class="h-4 w-4" />
				{/if}
				{crumb.label}
			</button>
		{/if}
	{/each}
</nav>
