<script lang="ts">
	import { onMount } from 'svelte';
	import { Key } from 'lucide-svelte';
	import { HalCollectionList } from '$lib/components/hal_collection';
	import { createHalResource } from '$lib/hooks/use_hal_resource';
	import { executeTemplate } from '$lib/hooks/use_template';
	import { toastStore } from '$lib/stores/toast_store';
	import TemplateForm from '$lib/components/hal_forms/template_form.svelte';
	import { Root as DialogRoot } from '$lib/components/ui/dialog.svelte';
	import DialogContent from '$lib/components/ui/dialog-content.svelte';
	import DialogHeader from '$lib/components/ui/dialog-header.svelte';
	import DialogTitle from '$lib/components/ui/dialog-title.svelte';
	import { Root as AlertDialogRoot } from '$lib/components/ui/alert-dialog.svelte';
	import AlertDialogContent from '$lib/components/ui/alert-dialog-content.svelte';
	import AlertDialogHeader from '$lib/components/ui/alert-dialog-header.svelte';
	import AlertDialogTitle from '$lib/components/ui/alert-dialog-title.svelte';
	import AlertDialogDescription from '$lib/components/ui/alert-dialog-description.svelte';
	import AlertDialogFooter from '$lib/components/ui/alert-dialog-footer.svelte';
	import Button from '$lib/components/ui/button.svelte';

	let resource = createHalResource('api-keys');
	let createModalOpen = false;
	let deleteModalOpen = false;
	let selectedIds: string[] = [];

	$: data = $resource.data;
	$: createTemplate = data?._templates?.create || data?._templates?.default;

	function handleCreate() {
		createModalOpen = true;
	}

	async function handleCreateSubmit(formData: Record<string, any>) {
		if (!createTemplate) return;
		try {
			await executeTemplate(createTemplate, formData);
			toastStore.success('API key created successfully');
			createModalOpen = false;
			resource.refresh();
		} catch (error) {
			toastStore.error('Failed to create API key');
		}
	}

	function handleBulkDelete(ids: string[]) {
		selectedIds = ids;
		deleteModalOpen = true;
	}

	async function confirmBulkDelete() {
		const bulkDeleteTemplate = data?._templates?.['bulk-delete'] || data?._templates?.bulkDelete;
		if (!bulkDeleteTemplate) return;

		try {
			await executeTemplate(bulkDeleteTemplate, { apiKeyIds: selectedIds });
			toastStore.success(`Deleted ${selectedIds.length} API key(s)`);
			deleteModalOpen = false;
			resource.refresh();
		} catch (error) {
			toastStore.error('Failed to delete API keys');
		}
	}
</script>

<div class="space-y-6">
	<!-- Page Header -->
	<div class="space-y-1">
		<h1 class="text-3xl font-bold tracking-tight">API Keys</h1>
		<p class="text-base-content/70">
			Manage your API keys for programmatic access to your resources
		</p>
	</div>

	<HalCollectionList
		resource={data}
		onRefresh={() => resource.refresh()}
		onCreate={handleCreate}
		onBulkDelete={handleBulkDelete}
		primaryKey="apiKeyId"
		columnConfig={{ dateLastUsed: { nullText: 'Never' } }}
		emptyMessage="You haven't created any API keys yet."
		emptyIcon={Key}
	/>

	<!-- Create Modal -->
	{#if createTemplate}
		<DialogRoot bind:open={createModalOpen}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{createTemplate.title}</DialogTitle>
				</DialogHeader>
				<TemplateForm
					template={createTemplate}
					on:submit={(e) => handleCreateSubmit(e.detail)}
					onCancel={() => createModalOpen = false}
				/>
			</DialogContent>
		</DialogRoot>
	{/if}

	<!-- Delete Confirmation -->
	<AlertDialogRoot bind:open={deleteModalOpen}>
		<AlertDialogContent>
			<AlertDialogHeader>
				<AlertDialogTitle>Delete API Keys?</AlertDialogTitle>
				<AlertDialogDescription>
					Are you sure you want to delete {selectedIds.length} API key(s)? This action cannot be
					undone.
				</AlertDialogDescription>
			</AlertDialogHeader>
			<AlertDialogFooter>
				<Button variant="outline" on:click={() => (deleteModalOpen = false)}>Cancel</Button>
				<Button variant="destructive" on:click={confirmBulkDelete}>Delete</Button>
			</AlertDialogFooter>
		</AlertDialogContent>
	</AlertDialogRoot>
</div>
