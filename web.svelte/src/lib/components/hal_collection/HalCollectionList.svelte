<script lang="ts">
	/**
	 * HalCollectionList - Generic collection component for HAL resources
	 *
	 * This component automatically renders a table with:
	 * - Inferred columns from embedded items
	 * - Selection and bulk operations
	 * - Action toolbar with create/refresh/delete
	 * - Field renderers based on data type
	 * - Empty and loading states
	 */

	import { Plus, RefreshCw } from 'lucide-svelte';
	import { processCollection, SelectionManager, type ColumnOverride } from '$lib/utils/collection_utils';
	import HalResourceRow from './HalResourceRow.svelte';
	import type { HalObject, BulkOperation } from '@houseofwolves/serverlesslaunchpad.web.commons';
	import type { FieldRenderer } from './field_renderers';
	import { cn } from '$lib/utils';
	import Button from '$lib/components/ui/button.svelte';

	// Props
	export let resource: HalObject | null | undefined;
	export let onRefresh: (() => void) | undefined = undefined;
	export let onCreate: (() => void) | undefined = undefined;
	export let bulkOperations: BulkOperation[] = [];
	export let onRowClick: ((item: HalObject) => void) | undefined = undefined;
	export let columnConfig: Record<string, ColumnOverride> = {};
	export let customRenderers: Record<string, FieldRenderer> | undefined = undefined;
	export let primaryKey = 'id';
	export let emptyMessage = 'No items found';
	export let emptyIcon: any = undefined;
	export let showCreateButton = true;
	export let showRefreshButton = true;
	export let selectableFilter: ((item: HalObject) => boolean) | undefined = undefined;
	/** Page title to display in the header row */
	export let title: string | undefined = undefined;

	// Process collection
	$: result = processCollection(resource, { columnConfig });
	$: ({ items, columns, templates, isEmpty } = result);

	// Detect primary key
	$: detectedPrimaryKey =
		items.length > 0
			? Object.keys(items[0]).find((key) => key.toLowerCase().endsWith('id')) || primaryKey
			: primaryKey;

	// Selection management - persistent state
	let selectedSet = new Set<string>();

	// Reactive selection state
	$: selectableItems = selectableFilter ? items.filter(selectableFilter) : items;
	$: selected = Array.from(selectedSet);
	$: allSelected = selectableItems.length > 0 && selectedSet.size === selectableItems.length;
	$: hasSelection = selectedSet.size > 0;
	$: selectedCount = selectedSet.size;

	function isSelected(id: string): boolean {
		return selectedSet.has(id);
	}

	function toggleSelection(id: string) {
		if (selectedSet.has(id)) {
			selectedSet.delete(id);
		} else {
			selectedSet.add(id);
		}
		// Force reactivity
		selectedSet = selectedSet;
	}

	function clearSelection() {
		selectedSet.clear();
		selectedSet = selectedSet;
	}

	function toggleAllSelection() {
		if (allSelected) {
			selectedSet.clear();
		} else {
			selectableItems.forEach(item => {
				const id = item[detectedPrimaryKey];
				if (id) selectedSet.add(id);
			});
		}
		selectedSet = selectedSet;
	}

	// Templates
	$: createTemplate = templates?.default || templates?.create;

	// Show checkboxes only if bulk operations are defined
	$: showCheckboxes = bulkOperations.length > 0;

	// Handlers
	function handleCreate() {
		if (onCreate) onCreate();
	}

	function handleRefresh() {
		if (onRefresh) onRefresh();
	}

	function handleBulkOperation(operation: BulkOperation) {
		if (hasSelection) {
			operation.handler(selected, clearSelection);
		}
	}

	function handleSelectAll() {
		toggleAllSelection();
	}

	function handleToggleSelection(itemId: string) {
		toggleSelection(itemId);
	}

	function handleRowClick(item: HalObject) {
		if (onRowClick) onRowClick(item);
	}
</script>

{#if isEmpty}
	<div class="space-y-4">
		<!-- Page title -->
		{#if title}
			<div class="space-y-1">
				<h1 class="text-3xl font-bold tracking-tight">{title}</h1>
			</div>
		{/if}

		<!-- Action toolbar -->
		<div class="flex items-center justify-end gap-2">
			{#if showCreateButton && createTemplate}
				<Button variant="outline" size="sm" on:click={handleCreate}>
					<Plus class="w-4 h-4 mr-2" />
					{createTemplate.title || 'Create'}
				</Button>
			{/if}
			{#if showRefreshButton}
				<Button variant="outline" size="sm" on:click={handleRefresh}>
					<RefreshCw class="w-4 h-4 mr-2" />
					Refresh
				</Button>
			{/if}
		</div>

		<!-- Empty state card -->
		<div class="rounded-xl border bg-card text-card-foreground shadow">
			<div class="flex flex-col items-center justify-center text-center p-12">
				{#if emptyIcon}
					<div class="mb-4 text-muted-foreground">
						<svelte:component this={emptyIcon} class="w-12 h-12" />
					</div>
				{/if}
				<h3 class="text-2xl font-semibold leading-none tracking-tight">No Items</h3>
				<p class="text-sm text-muted-foreground mt-2 mb-6">{emptyMessage}</p>
				{#if showCreateButton && createTemplate}
					<Button variant="outline" on:click={handleCreate}>
						<Plus class="w-4 h-4 mr-2" />
						{createTemplate.title || 'Create First Item'}
					</Button>
				{/if}
			</div>
		</div>
	</div>
{:else}
	<div class="space-y-4">
		<!-- Page title -->
		{#if title}
			<div class="space-y-1">
				<h1 class="text-3xl font-bold tracking-tight">{title}</h1>
			</div>
		{/if}

		<!-- Action toolbar -->
		<div class="flex items-center justify-between">
			{#if hasSelection}
				<div class="flex items-center gap-4">
					<span class="text-sm text-muted-foreground">
						{selectedCount} item{selectedCount > 1 ? 's' : ''} selected
					</span>
					<Button
						variant="ghost"
						size="sm"
						on:click={() => {
							clearSelection();
						}}
					>
						Clear
					</Button>
				</div>
			{:else}
				<div></div>
			{/if}

			<div class="flex items-center gap-2">
				{#if hasSelection && bulkOperations.length > 0}
					{#each bulkOperations as operation (operation.id)}
						{@const isDisabled = operation.disabled ? operation.disabled(selected) : false}
						<Button
							variant={operation.variant === 'destructive' ? 'outline' : (operation.variant || 'outline')}
							size="sm"
							on:click={() => handleBulkOperation(operation)}
							disabled={isDisabled}
							class={operation.variant === 'destructive' ? 'text-destructive hover:text-destructive' : ''}
						>
							{#if operation.icon}
								{@const IconComponent = operation.icon as import('svelte').Component<{ class?: string }>}
								<svelte:component this={IconComponent} class="w-4 h-4 mr-2" />
							{/if}
							{operation.label}
						</Button>
					{/each}
				{/if}
				{#if showCreateButton && createTemplate}
					<Button variant="outline" size="sm" on:click={handleCreate}>
						<Plus class="w-4 h-4 mr-2" />
						{createTemplate.title || 'Create'}
					</Button>
				{/if}
				{#if showRefreshButton}
					<Button variant="outline" size="sm" on:click={handleRefresh}>
						<RefreshCw class="w-4 h-4 mr-2" />
						Refresh
					</Button>
				{/if}
			</div>
		</div>

		<!-- Table -->
		<div class="rounded-xl border bg-card text-card-foreground shadow">
			<div class="relative w-full overflow-auto">
				<table class="w-full caption-bottom text-sm table-fixed">
					<thead class="[&_tr]:border-b">
						<tr class="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
							{#if showCheckboxes}
								<th class="h-10 px-4 text-left align-middle font-medium text-muted-foreground w-12">
									<input
										type="checkbox"
										class="peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
										checked={allSelected}
										on:change={handleSelectAll}
										aria-label="Select all"
									/>
								</th>
							{/if}
							{#each columns as col (col.key)}
								<th class="h-10 px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap" style="width: {col.width}">
									{col.label}
								</th>
							{/each}
						</tr>
					</thead>
					<tbody class="[&_tr:last-child]:border-0">
						{#each items as item (item[detectedPrimaryKey] || Math.random())}
							{@const isItemSelectable = !selectableFilter || selectableFilter(item)}
							<HalResourceRow
								{item}
								{columns}
								showCheckbox={showCheckboxes}
								selectable={isItemSelectable}
								selected={isSelected(item[detectedPrimaryKey])}
								onToggleSelect={() => handleToggleSelection(item[detectedPrimaryKey])}
								onRowClick={() => handleRowClick(item)}
								{customRenderers}
							/>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</div>
{/if}
