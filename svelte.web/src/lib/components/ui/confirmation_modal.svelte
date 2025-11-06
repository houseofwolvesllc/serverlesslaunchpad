<script lang="ts">
	import { AlertTriangle } from 'lucide-svelte';

	export let open = false;
	export let title = 'Confirm Action';
	export let message = 'Are you sure you want to proceed?';
	export let confirmText = 'Confirm';
	export let cancelText = 'Cancel';
	export let variant: 'danger' | 'warning' | 'info' = 'danger';
	export let onConfirm: () => void | Promise<void>;
	export let onCancel: () => void;
	export let loading = false;

	const variantClasses = {
		danger: 'variant-filled-error',
		warning: 'variant-filled-warning',
		info: 'variant-filled-primary',
	};

	async function handleConfirm() {
		try {
			await onConfirm();
		} catch (error) {
			console.error('Confirmation action failed:', error);
		}
	}
</script>

{#if open}
	<div class="modal modal-open">
		<div class="modal-box">
			<div class="flex items-start gap-3 mb-4">
				<div class="text-warning-500">
					<AlertTriangle size={24} />
				</div>
				<div class="flex-1">
					<h3 class="h4 font-bold">{title}</h3>
					<p class="mt-2 opacity-80">{message}</p>
				</div>
			</div>

			<div class="modal-action">
				<button
					class="btn variant-ghost-surface"
					on:click={onCancel}
					disabled={loading}
				>
					{cancelText}
				</button>
				<button
					class="btn {variantClasses[variant]}"
					on:click={handleConfirm}
					disabled={loading}
				>
					{#if loading}
						<span class="loading loading-spinner loading-sm"></span>
					{/if}
					{confirmText}
				</button>
			</div>
		</div>
		<button class="modal-backdrop" on:click={onCancel} aria-label="Close"></button>
	</div>
{/if}
