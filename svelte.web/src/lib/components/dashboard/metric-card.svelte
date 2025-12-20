<script lang="ts">
	import Card from '$lib/components/ui/card.svelte';
	import CardContent from '$lib/components/ui/card-content.svelte';
	import { TrendingUp, TrendingDown } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import Skeleton from '$lib/components/ui/skeleton.svelte';
	import { cn } from '$lib/utils';
	import type { ComponentType } from 'svelte';

	// Props
	export let title: string;
	export let value: string | number;
	export let description: string = '';
	export let icon: ComponentType;
	export let trend: 'up' | 'down' | 'neutral' = 'neutral';
	export let trendValue: string = '';
	export let href: string | undefined = undefined;
	export let loading = false;

	let className: string | undefined = undefined;
	export { className as class };

	function handleClick() {
		if (href) goto(href);
	}
</script>

<Card
	class={cn(
		'transition-all duration-200',
		href && 'cursor-pointer hover:shadow-lg hover:scale-[1.02]',
		className
	)}
	on:click={handleClick}
	role={href ? 'button' : undefined}
	tabindex={href ? 0 : undefined}
>
	<CardContent class="p-6">
		<div class="flex items-center justify-between">
			<div class="flex-1 space-y-2">
				<p class="text-sm font-medium text-muted-foreground">{title}</p>
				{#if loading}
					<Skeleton class="h-9 w-28" />
				{:else}
					<p class="text-3xl font-bold tracking-tight">{value}</p>
				{/if}
				{#if description || trendValue}
					<div class="flex items-center gap-1 text-xs text-muted-foreground">
						{#if trend !== 'neutral' && trendValue}
							{#if trend === 'up'}
								<TrendingUp class="h-3 w-3 text-emerald-500" />
							{:else}
								<TrendingDown class="h-3 w-3 text-red-500" />
							{/if}
							<span class={trend === 'up' ? 'text-emerald-500' : 'text-red-500'}>
								{trendValue}
							</span>
						{/if}
						{#if description}
							<span class="ml-1">{description}</span>
						{/if}
					</div>
				{/if}
			</div>
			<div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
				<svelte:component this={icon} class="h-6 w-6 text-primary" />
			</div>
		</div>
	</CardContent>
</Card>
