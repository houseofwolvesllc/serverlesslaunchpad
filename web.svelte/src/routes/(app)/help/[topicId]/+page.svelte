<!--
  Help Topic Detail

  Resolves the topic from the URL parameter and renders
  the corresponding content component.
-->

<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { ArrowLeft } from 'lucide-svelte';
	import Button from '$lib/components/ui/button.svelte';
	import { getHelpTopicById } from '$lib/features/help/help_topic_registry';

	$: topicId = $page.params.topicId;
	$: topic = topicId ? getHelpTopicById(topicId) : undefined;
</script>

<div class="space-y-6">
	<Button variant="ghost" class="gap-2" on:click={() => goto('/help')}>
		<ArrowLeft class="h-4 w-4" />
		Back to Help Center
	</Button>

	{#if topic}
		{#await topic.load() then module}
			<svelte:component this={module.default} />
		{:catch}
			<div class="text-center py-12">
				<h2 class="text-2xl font-semibold tracking-tight">Failed to Load Topic</h2>
				<p class="text-muted-foreground mt-2">
					There was an error loading this help topic. Please try again.
				</p>
			</div>
		{/await}
	{:else}
		<div class="text-center py-12">
			<h2 class="text-2xl font-semibold tracking-tight">Topic Not Found</h2>
			<p class="text-muted-foreground mt-2">
				The help topic you are looking for does not exist.
			</p>
		</div>
	{/if}
</div>
