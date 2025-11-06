<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { ChevronRight, Home } from 'lucide-svelte';
	import { cn } from '$lib/utils';

	let className: string | undefined = undefined;
	export { className as class };

	interface Breadcrumb {
		label: string;
		path: string;
	}

	// Map of path segments to readable labels
	const labelMap: Record<string, string> = {
		dashboard: 'Dashboard',
		'api-keys': 'API Keys',
		sessions: 'Sessions',
		account: 'My Account',
		profile: 'Profile',
		settings: 'Settings',
		docs: 'Documentation'
	};

	function generateBreadcrumbs(pathname: string): Breadcrumb[] {
		const segments = pathname.split('/').filter(Boolean);
		const breadcrumbs: Breadcrumb[] = [
			// Always start with Dashboard
			{ label: 'Dashboard', path: '/dashboard' }
		];

		// Build up path and create breadcrumbs for non-dashboard pages
		let currentPath = '';
		for (const segment of segments) {
			// Skip dashboard since we already added it
			if (segment === 'dashboard') continue;

			currentPath += `/${segment}`;

			const label = labelMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
			breadcrumbs.push({
				label,
				path: currentPath
			});
		}

		return breadcrumbs;
	}

	$: breadcrumbs = generateBreadcrumbs($page.url.pathname);
	$: isLastIndex = (index: number) => index === breadcrumbs.length - 1;
</script>

<nav aria-label="Breadcrumb" class={cn('flex items-center space-x-2 text-sm', className)}>
	{#each breadcrumbs as crumb, index}
		{#if index > 0}
			<ChevronRight class="h-4 w-4 text-muted-foreground" />
		{/if}

		{#if isLastIndex(index)}
			<span class="font-medium text-foreground flex items-center gap-1.5">
				{#if index === 0}
					<Home class="h-4 w-4" />
				{/if}
				{crumb.label}
			</span>
		{:else}
			<button
				on:click={() => goto(crumb.path)}
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
