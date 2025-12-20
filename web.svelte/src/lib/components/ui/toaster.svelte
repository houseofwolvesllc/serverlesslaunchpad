<script lang="ts">
	import { toastStore, type Toast } from '$lib/stores/toast_store';
	import { flip } from 'svelte/animate';
	import { fly } from 'svelte/transition';
	import {
		CircleCheckBig,
		CircleAlert,
		TriangleAlert,
		Info,
		X
	} from 'lucide-svelte';
	import type { ComponentType } from 'svelte';

	const icons: Record<Toast['variant'], ComponentType> = {
		success: CircleCheckBig,
		error: CircleAlert,
		warning: TriangleAlert,
		info: Info,
	};

	const variants: Record<Toast['variant'], string> = {
		success: 'alert-success',
		error: 'alert-error',
		warning: 'alert-warning',
		info: 'alert-info',
	};
</script>

<div class="toast-container fixed top-4 right-4 z-[9999] space-y-2 max-w-md">
	{#each $toastStore as toast (toast.id)}
		<div
			class="alert {variants[toast.variant]} flex items-center gap-3 shadow-lg"
			animate:flip={{ duration: 200 }}
			in:fly={{ x: 300, duration: 200 }}
			out:fly={{ x: 300, duration: 200 }}
		>
			<svelte:component this={icons[toast.variant]} size={20} />
			<span class="flex-1">{toast.message}</span>
			<button
				class="btn-icon btn-icon-sm"
				on:click={() => toastStore.remove(toast.id)}
				aria-label="Close"
			>
				<X size={16} />
			</button>
		</div>
	{/each}
</div>
