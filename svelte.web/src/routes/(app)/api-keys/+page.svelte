<script lang="ts">
	import { onMount } from 'svelte';
	import { createHalResourcePaginated } from '$lib/hooks/use_hal_resource_paginated';
	import { executeTemplate } from '$lib/hooks/use_template';
	import { toastStore } from '$lib/stores/toast_store';
	import { Key, RefreshCw, Plus, Trash2, Copy, ChevronDown, ChevronUp } from 'lucide-svelte';
	import TemplateForm from '$lib/components/hal_forms/template_form.svelte';
	import type { HalObject } from '@houseofwolves/serverlesslaunchpad.types/hal';
	import Card from '$lib/components/ui/card.svelte';
	import CardHeader from '$lib/components/ui/card-header.svelte';
	import CardContent from '$lib/components/ui/card-content.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import { Root as DialogRoot } from '$lib/components/ui/dialog.svelte';
	import DialogContent from '$lib/components/ui/dialog-content.svelte';
	import DialogHeader from '$lib/components/ui/dialog-header.svelte';
	import DialogTitle from '$lib/components/ui/dialog-title.svelte';
	import DialogDescription from '$lib/components/ui/dialog-description.svelte';
	import DialogFooter from '$lib/components/ui/dialog-footer.svelte';
	import { Root as AlertDialogRoot } from '$lib/components/ui/alert-dialog.svelte';
	import AlertDialogContent from '$lib/components/ui/alert-dialog-content.svelte';
	import AlertDialogHeader from '$lib/components/ui/alert-dialog-header.svelte';
	import AlertDialogTitle from '$lib/components/ui/alert-dialog-title.svelte';
	import AlertDialogDescription from '$lib/components/ui/alert-dialog-description.svelte';
	import AlertDialogFooter from '$lib/components/ui/alert-dialog-footer.svelte';
	import Table from '$lib/components/ui/table.svelte';
	import TableHeader from '$lib/components/ui/table-header.svelte';
	import TableBody from '$lib/components/ui/table-body.svelte';
	import TableHead from '$lib/components/ui/table-head.svelte';
	import TableRow from '$lib/components/ui/table-row.svelte';
	import TableCell from '$lib/components/ui/table-cell.svelte';
	import Checkbox from '$lib/components/ui/checkbox.svelte';
	import Skeleton from '$lib/components/ui/skeleton.svelte';
	import Input from '$lib/components/ui/input.svelte';
	import Label from '$lib/components/ui/label.svelte';
	import PaginationControls from '$lib/components/ui/pagination-controls.svelte';
	import { format } from 'date-fns';

	interface ApiKey extends HalObject {
		apiKeyId: string;
		apiKey: string;
		label?: string;
		dateCreated: string;
		dateLastUsed?: string;
		expiresAt?: string;
	}

	let resource = createHalResourcePaginated<HalObject>('api-keys', 'api_keys_page_size');
	let { pagination } = resource;
	let createModalOpen = false;
	let deleteModalOpen = false;
	let displayKeyModalOpen = false;
	let selectedKeys: Set<string> = new Set();
	let newlyCreatedKey: string | null = null;
	let submitting = false;
	let sortKey: 'label' | 'dateCreated' | 'expiresAt' | null = null;
	let sortDirection: 'asc' | 'desc' = 'asc';

	$: data = $resource.data;
	$: loading = $resource.loading;
	$: apiKeys = (data?._embedded?.apiKeys as ApiKey[]) || [];
	$: paginationInfo = $pagination;
	$: createTemplate = data?._templates?.default; // HAL-FORMS standard: 'default' is the primary create template
	$: bulkDeleteTemplate = data?._templates?.bulkDelete;
	$: allSelected = apiKeys.length > 0 && selectedKeys.size === apiKeys.length;
	$: someSelected = selectedKeys.size > 0 && selectedKeys.size < apiKeys.length;

	onMount(() => {
		resource.init();
	});

	// Sorting
	$: sortedKeys = sortApiKeys(apiKeys, sortKey, sortDirection);

	function sortApiKeys(keys: ApiKey[], key: typeof sortKey, direction: 'asc' | 'desc'): ApiKey[] {
		if (!key) return keys;

		return [...keys].sort((a, b) => {
			let aVal = a[key];
			let bVal = b[key];

			if (key === 'dateCreated' || key === 'expiresAt') {
				aVal = aVal ? new Date(aVal as string).getTime() : 0;
				bVal = bVal ? new Date(bVal as string).getTime() : 0;
			}

			if (aVal < bVal) return direction === 'asc' ? -1 : 1;
			if (aVal > bVal) return direction === 'asc' ? 1 : -1;
			return 0;
		});
	}

	function handleSort(key: 'label' | 'dateCreated' | 'expiresAt') {
		if (sortKey === key) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortKey = key;
			sortDirection = 'asc';
		}
	}

	function toggleAll() {
		if (allSelected || someSelected) {
			selectedKeys.clear();
		} else {
			selectedKeys = new Set(apiKeys.map(k => k.apiKeyId));
		}
		selectedKeys = selectedKeys;
	}

	function toggleKey(apiKeyId: string) {
		if (selectedKeys.has(apiKeyId)) {
			selectedKeys.delete(apiKeyId);
		} else {
			selectedKeys.add(apiKeyId);
		}
		selectedKeys = selectedKeys;
	}

	async function handleCreate(event: CustomEvent<Record<string, any>>) {
		if (!createTemplate) return;

		submitting = true;
		try {
			const result = await executeTemplate(createTemplate, event.detail);

			if (result.apiKey) {
				newlyCreatedKey = result.apiKey;
				displayKeyModalOpen = true;
			}

			toastStore.success('API key created successfully');
			createModalOpen = false;
			resource.refresh();
		} catch (error: any) {
			toastStore.error(error.detail || 'Failed to create API key');
		} finally {
			submitting = false;
		}
	}


	async function handleBulkDelete() {
		if (!bulkDeleteTemplate) {
			toastStore.error('Delete operation not available');
			return;
		}

		submitting = true;
		const apiKeyIds = Array.from(selectedKeys);

		try {
			await executeTemplate(bulkDeleteTemplate, { apiKeyIds });
			toastStore.success(`Deleted ${apiKeyIds.length} API key(s)`);
			selectedKeys.clear();
			selectedKeys = selectedKeys;
			deleteModalOpen = false;
			resource.refresh();
		} catch (error: any) {
			toastStore.error(error.detail || 'Failed to delete API keys');
		} finally {
			submitting = false;
		}
	}

	function formatDate(dateString: string): string {
		return format(new Date(dateString), 'MMM d, yyyy');
	}

	function copyToClipboard(text: string) {
		navigator.clipboard.writeText(text);
		toastStore.success('Copied to clipboard');
	}

	async function handleDeleteConfirm() {
		await handleBulkDelete();
	}
</script>

<div class="space-y-6">
	<!-- Page Header -->
	<div class="space-y-1">
		<h1 class="text-3xl font-bold tracking-tight">API Keys</h1>
		<p class="text-muted-foreground">
			Manage your API keys for programmatic access to your resources
		</p>
	</div>

	<!-- Actions Toolbar -->
	<div class="flex items-center justify-between">
		{#if selectedKeys.size > 0}
			<span class="text-sm font-medium">
				{selectedKeys.size} key{selectedKeys.size > 1 ? 's' : ''} selected
			</span>
		{:else}
			<div></div>
		{/if}
		<div class="flex items-center gap-2">
			{#if selectedKeys.size > 0}
				<Button
					variant="outline"
					size="sm"
					class="h-9 px-4"
					on:click={() => {
						selectedKeys.clear();
						selectedKeys = selectedKeys;
					}}
				>
					Clear Selection
				</Button>
				<Button
					variant="outline"
					size="sm"
					class="h-9 px-4"
					on:click={() => {
						deleteModalOpen = true;
					}}
					disabled={submitting}
				>
					<Trash2 class="mr-2 h-4 w-4" />
					Delete Selected
				</Button>
			{/if}
			{#if createTemplate}
				<Button variant="outline" size="sm" class="h-9 px-4" on:click={() => (createModalOpen = true)}>
					<Plus class="mr-2 h-4 w-4" />
					Create API Key
				</Button>
			{/if}
			<Button variant="outline" size="sm" class="h-9 px-4" on:click={() => resource.refresh()}>
				<RefreshCw class="mr-2 h-4 w-4" />
				Refresh
			</Button>
		</div>
	</div>

	<!-- API Keys Table -->
	<Card>
		<CardContent class="p-0">
			{#if loading}
				<div class="p-6 space-y-4">
					{#each Array(3) as _}
						<div class="flex items-center gap-4">
							<Skeleton class="h-4 w-4" />
							<Skeleton class="h-4 flex-1" />
							<Skeleton class="h-8 w-20" />
						</div>
					{/each}
				</div>
			{:else if apiKeys.length === 0}
				<div class="flex flex-col items-center justify-center py-16 text-center">
					<div class="rounded-full bg-muted p-4 mb-4">
						<Key class="h-8 w-8 text-muted-foreground" />
					</div>
					<h3 class="text-lg font-semibold mb-2">No API Keys</h3>
					<p class="text-sm text-muted-foreground mb-4 max-w-sm">
						You haven't created any API keys yet. Create one to get started with programmatic access.
					</p>
					{#if createTemplate}
						<Button on:click={() => (createModalOpen = true)}>
							<Plus class="mr-2 h-4 w-4" />
							Create Your First API Key
						</Button>
					{/if}
				</div>
			{:else}
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead class="w-12">
								<Checkbox
									checked={allSelected}
									indeterminate={someSelected}
									onCheckedChange={toggleAll}
								/>
							</TableHead>
							<TableHead class="w-[200px]">
								<button
									class="flex items-center gap-1 hover:text-foreground"
									on:click={() => handleSort('label')}
								>
									Label
									{#if sortKey === 'label'}
										{#if sortDirection === 'asc'}
											<ChevronUp class="h-4 w-4" />
										{:else}
											<ChevronDown class="h-4 w-4" />
										{/if}
									{/if}
								</button>
							</TableHead>
							<TableHead class="min-w-[400px]">API Key</TableHead>
							<TableHead class="w-[150px]">
								<button
									class="flex items-center gap-1 hover:text-foreground"
									on:click={() => handleSort('dateCreated')}
								>
									Created
									{#if sortKey === 'dateCreated'}
										{#if sortDirection === 'asc'}
											<ChevronUp class="h-4 w-4" />
										{:else}
											<ChevronDown class="h-4 w-4" />
										{/if}
									{/if}
								</button>
							</TableHead>
							<TableHead class="w-[150px]">Last Used</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{#each sortedKeys as apiKey (apiKey.apiKeyId)}
							<TableRow class={selectedKeys.has(apiKey.apiKeyId) ? 'bg-muted/50' : ''}>
								<TableCell>
									<Checkbox
										checked={selectedKeys.has(apiKey.apiKeyId)}
										onCheckedChange={() => toggleKey(apiKey.apiKeyId)}
									/>
								</TableCell>
								<TableCell class="font-medium">{apiKey.label}</TableCell>
								<TableCell class="min-w-[400px]">
									<div class="flex items-center gap-2 w-full">
										<code class="text-sm font-mono bg-muted px-2 py-1 rounded flex-1 break-all">{apiKey.apiKey}</code>
										<Button
											variant="ghost"
											size="icon"
											class="h-8 w-8 flex-shrink-0"
											on:click={() => copyToClipboard(apiKey.apiKey)}
											title="Copy API key"
										>
											<Copy class="h-4 w-4" />
										</Button>
									</div>
								</TableCell>
								<TableCell class="text-muted-foreground">
									{formatDate(apiKey.dateCreated)}
								</TableCell>
								<TableCell class="text-muted-foreground">
									{#if apiKey.dateLastUsed}
										{formatDate(apiKey.dateLastUsed)}
									{:else}
										<span class="text-xs">Never</span>
									{/if}
								</TableCell>
							</TableRow>
						{/each}
					</TableBody>
				</Table>

				<!-- Pagination Controls -->
				{#if apiKeys.length > 0}
					<div class="px-6 pb-6">
						<PaginationControls
							hasNext={paginationInfo.hasNext}
							hasPrevious={paginationInfo.hasPrevious}
							pageSize={paginationInfo.pageSize}
							onNextPage={() => resource.nextPage()}
							onPreviousPage={() => resource.previousPage()}
							onPageSizeChange={(size) => resource.changePageSize(size)}
							disabled={loading}
						/>
					</div>
				{/if}
			{/if}
		</CardContent>
	</Card>
</div>

<!-- Create Modal -->
<DialogRoot bind:open={createModalOpen}>
	<DialogContent class="sm:max-w-[500px]">
		<DialogHeader>
			<DialogTitle>{createTemplate?.title || 'Create API Key'}</DialogTitle>
			<DialogDescription>
				Generate a new API key for programmatic access. Make sure to copy it after creation.
			</DialogDescription>
		</DialogHeader>
		{#if createTemplate}
			<TemplateForm
				template={createTemplate}
				loading={submitting}
				on:submit={handleCreate}
				onCancel={() => (createModalOpen = false)}
			/>
		{/if}
	</DialogContent>
</DialogRoot>

<!-- Display Key Modal -->
<DialogRoot bind:open={displayKeyModalOpen}>
	<DialogContent class="sm:max-w-[500px]">
		<DialogHeader>
			<DialogTitle>API Key Created</DialogTitle>
			<DialogDescription>
				Your API key has been created successfully.
			</DialogDescription>
		</DialogHeader>
		<div class="space-y-4 py-4">
			<div class="space-y-2">
				<Label>Your API Key</Label>
				<div class="flex gap-2">
					<Input
						type="text"
						value={newlyCreatedKey}
						readonly
						class="font-mono text-sm"
					/>
					<Button
						variant="outline"
						on:click={() => copyToClipboard(newlyCreatedKey || '')}
					>
						<Copy class="h-4 w-4" />
					</Button>
				</div>
			</div>
		</div>
		<DialogFooter>
			<Button
				on:click={() => {
					displayKeyModalOpen = false;
					newlyCreatedKey = null;
				}}
			>
				Done
			</Button>
		</DialogFooter>
	</DialogContent>
</DialogRoot>

<!-- Delete Confirmation Modal -->
<AlertDialogRoot bind:open={deleteModalOpen}>
	<AlertDialogContent>
		<AlertDialogHeader>
			<AlertDialogTitle>Delete API Keys</AlertDialogTitle>
			<AlertDialogDescription>
				Are you sure you want to delete {selectedKeys.size} API key{selectedKeys.size > 1
					? 's'
					: ''}? This action cannot be undone and will immediately revoke access.
			</AlertDialogDescription>
		</AlertDialogHeader>
		<AlertDialogFooter>
			<Button
				variant="outline"
				on:click={() => {
					deleteModalOpen = false;
				}}
			>
				Cancel
			</Button>
			<Button
				variant="destructive"
				on:click={async (e) => {
					e.preventDefault();
					await handleDeleteConfirm();
				}}
				disabled={submitting}
			>
				{submitting ? 'Deleting...' : 'Delete'}
			</Button>
		</AlertDialogFooter>
	</AlertDialogContent>
</AlertDialogRoot>
