<script lang="ts">
	import { toastStore } from '$lib/stores/toast_store';
	import { flip } from 'svelte/animate';
	import { fly } from 'svelte/transition';
	import {
		CheckCircle,
		AlertCircle,
		AlertTriangle,
		Info,
		X
	} from 'lucide-svelte';

	const icons = {
		success: CheckCircle,
		error: AlertCircle,
		warning: AlertTriangle,
		info: Info,
	};

	const variants = {
		success: 'variant-filled-success',
		error: 'variant-filled-error',
		warning: 'variant-filled-warning',
		info: 'variant-filled-primary',
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
