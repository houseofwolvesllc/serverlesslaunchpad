<script lang="ts">
	import { Inbox } from 'lucide-svelte';
	import type { ComponentType } from 'svelte';

	export let title: string;
	export let message: string;
	export let icon: ComponentType = Inbox;
	export let actionText: string | undefined = undefined;
	export let onAction: (() => void) | undefined = undefined;
</script>

<div class="flex flex-col items-center justify-center py-12 px-4 text-center">
	<div class="mb-4 opacity-50">
		<svelte:component this={icon} size={64} />
	</div>
	<h3 class="h4 mb-2">{title}</h3>
	<p class="text-surface-600-300-token mb-6 max-w-md">{message}</p>
	{#if actionText && onAction}
		<button class="btn variant-filled-primary" on:click={onAction}>
			{actionText}
		</button>
	{/if}
</div>
