<script lang="ts">
	import { Key, Trash2 } from 'lucide-svelte';
	import { HalCollectionList } from '$lib/components/hal_collection';
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
	import type { HalObject } from '@houseofwolves/serverlesslaunchpad.types/hal';

	// Required prop - the HAL resource fetched by the generic route
	// This resource contains the correct _templates with proper target URLs
	export let resource: HalObject;

	// Optional refresh callback - called after bulk operations
	export let onRefresh: (() => void) | undefined = undefined;

	let createModalOpen = false;
	let deleteModalOpen = false;
	let selectedIds: string[] = [];

	// Use the passed resource directly
	$: data = resource;
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
			onRefresh?.();
		} catch (error) {
			toastStore.error('Failed to create API key');
		}
	}

	function handleBulkDelete(ids: string[]) {
		selectedIds = ids;
		deleteModalOpen = true;
	}

	async function confirmBulkDelete() {
		// Use templates from the passed resource - these have the correct target URLs
		const bulkDeleteTemplate = data?._templates?.['bulk-delete'] || data?._templates?.bulkDelete;
		if (!bulkDeleteTemplate) return;

		try {
			await executeTemplate(bulkDeleteTemplate, { apiKeyIds: selectedIds });
			toastStore.success(`Deleted ${selectedIds.length} API key(s)`);
			deleteModalOpen = false;
			onRefresh?.();
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
		onRefresh={onRefresh}
		onCreate={handleCreate}
		bulkOperations={[
			{
				id: 'delete',
				label: 'Delete Selected',
				icon: Trash2,
				variant: 'destructive',
				handler: handleBulkDelete,
			},
		]}
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
