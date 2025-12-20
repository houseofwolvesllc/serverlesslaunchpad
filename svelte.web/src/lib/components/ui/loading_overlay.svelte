<script lang="ts">
	import { loadingStore } from '$lib/stores/loading_store';
	import { fade } from 'svelte/transition';
</script>

{#if $loadingStore}
	<div
		class="fixed inset-0 z-[9998] flex items-center justify-center bg-surface-900/80"
		transition:fade={{ duration: 150 }}
	>
		<div class="card p-8 flex flex-col items-center gap-4">
			<div class="w-12 h-12">
				<svg class="animate-spin text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
					<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
				</svg>
			</div>
			<p class="text-lg">Loading...</p>
		</div>
	</div>
{/if}
