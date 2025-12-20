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

	import { Plus, RefreshCw, Trash2 } from 'lucide-svelte';
	import { processCollection, SelectionManager, type ColumnOverride } from '$lib/utils/collection_utils';
	import HalResourceRow from './HalResourceRow.svelte';
	import type { HalObject } from '@houseofwolves/serverlesslaunchpad.web.commons';
	import type { FieldRenderer } from './field_renderers';
	import { cn } from '$lib/utils';

	// Props
	export let resource: HalObject | null | undefined;
	export let onRefresh: (() => void) | undefined = undefined;
	export let onCreate: (() => void) | undefined = undefined;
	export let onBulkDelete: ((selectedIds: string[]) => void) | undefined = undefined;
	export let onRowClick: ((item: HalObject) => void) | undefined = undefined;
	export let columnConfig: Record<string, ColumnOverride> = {};
	export let customRenderers: Record<string, FieldRenderer> | undefined = undefined;
	export let primaryKey = 'id';
	export let emptyMessage = 'No items found';
	export let emptyIcon: any = undefined;
	export let showCreateButton = true;
	export let showRefreshButton = true;
	export let showBulkDelete = true;

	// Process collection
	$: result = processCollection(resource, { columnConfig });
	$: ({ items, columns, templates, isEmpty } = result);

	// Detect primary key
	$: detectedPrimaryKey =
		items.length > 0
			? Object.keys(items[0]).find((key) => key.toLowerCase().endsWith('id')) || primaryKey
			: primaryKey;

	// Selection management
	let selectionManager: SelectionManager;
	$: selectionManager = new SelectionManager(items, detectedPrimaryKey);
	$: selected = selectionManager.selectedIds;
	$: allSelected = selectionManager.allSelected;
	$: hasSelection = selectionManager.hasSelection;
	$: selectedCount = selectionManager.count;

	// Templates
	$: createTemplate = templates?.default || templates?.create;
	$: bulkDeleteTemplate = templates?.bulkDelete || templates?.['bulk-delete'];
	$: canBulkDelete = showBulkDelete && (!!bulkDeleteTemplate || !!onBulkDelete);

	// Handlers
	function handleCreate() {
		if (onCreate) onCreate();
	}

	function handleRefresh() {
		if (onRefresh) onRefresh();
	}

	function handleBulkDelete() {
		if (onBulkDelete && hasSelection) {
			onBulkDelete(selected);
		}
	}

	function handleSelectAll() {
		selectionManager.toggleAll();
		// Force reactivity update
		selected = selectionManager.selectedIds;
	}

	function handleToggleSelection(itemId: string) {
		selectionManager.toggleSelection(itemId);
		// Force reactivity update
		selected = selectionManager.selectedIds;
	}

	function handleRowClick(item: HalObject) {
		if (onRowClick) onRowClick(item);
	}
</script>

{#if isEmpty}
	<div class="space-y-4">
		<!-- Toolbar for empty state -->
		<div class="flex items-center justify-between">
			<div></div>
			<div class="flex items-center gap-2">
				{#if showCreateButton && createTemplate}
					<button
						class="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2"
						on:click={handleCreate}
					>
						<Plus class="w-4 h-4" />
						{createTemplate.title || 'Create'}
					</button>
				{/if}
				{#if showRefreshButton}
					<button
						class="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
						on:click={handleRefresh}
					>
						<RefreshCw class="w-4 h-4" />
						Refresh
					</button>
				{/if}
			</div>
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
					<button
						class="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-10 px-4 py-2"
						on:click={handleCreate}
					>
						<Plus class="w-4 h-4" />
						{createTemplate.title || 'Create First Item'}
					</button>
				{/if}
			</div>
		</div>
	</div>
{:else}
	<div class="space-y-4">
		<!-- Action Toolbar -->
		<div class="flex items-center justify-between">
			{#if hasSelection}
				<div class="flex items-center gap-4">
					<span class="text-sm font-medium">
						{selectedCount} item{selectedCount > 1 ? 's' : ''} selected
					</span>
					<button
						class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 px-3"
						on:click={() => {
							selectionManager.clearSelection();
							selected = [];
						}}
					>
						Clear
					</button>
				</div>
			{:else}
				<div></div>
			{/if}

			<div class="flex items-center gap-2">
				{#if hasSelection && canBulkDelete}
					<button
						class="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 h-9 px-4 py-2"
						on:click={handleBulkDelete}
					>
						<Trash2 class="w-4 h-4" />
						Delete Selected
					</button>
				{/if}
				{#if showCreateButton && createTemplate}
					<button
						class="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2"
						on:click={handleCreate}
					>
						<Plus class="w-4 h-4" />
						{createTemplate.title || 'Create'}
					</button>
				{/if}
				{#if showRefreshButton}
					<button
						class="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
						on:click={handleRefresh}
					>
						<RefreshCw class="w-4 h-4" />
						Refresh
					</button>
				{/if}
			</div>
		</div>

		<!-- Table -->
		<div class="rounded-xl border bg-card text-card-foreground shadow">
			<div class="relative w-full overflow-auto">
				<table class="w-full caption-bottom text-sm">
					<thead class="[&_tr]:border-b">
						<tr class="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
							{#if canBulkDelete}
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
								<th class="h-10 px-4 text-left align-middle font-medium text-muted-foreground" style="width: {col.width}">
									{col.label}
								</th>
							{/each}
						</tr>
					</thead>
					<tbody class="[&_tr:last-child]:border-0">
						{#each items as item (item[detectedPrimaryKey] || Math.random())}
							<HalResourceRow
								{item}
								{columns}
								selectable={canBulkDelete}
								selected={selectionManager.isSelected(item[detectedPrimaryKey])}
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
