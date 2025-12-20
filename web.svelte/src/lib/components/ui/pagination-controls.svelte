<script lang="ts">
	import { ChevronLeft, ChevronRight } from 'lucide-svelte';
	import Button from './button.svelte';
	import { PAGE_SIZE_OPTIONS, type PageSize } from '@houseofwolves/serverlesslaunchpad.types/pagination';

	export let hasNext: boolean;
	export let hasPrevious: boolean;
	export let pageSize: PageSize;
	export let onNextPage: () => void;
	export let onPreviousPage: () => void;
	export let onPageSizeChange: (size: PageSize) => void;
	export let disabled: boolean = false;

	// Don't show pagination if there are no pages to navigate
	$: showPagination = hasNext || hasPrevious;

	function handlePageSizeChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		if (target.value) {
			onPageSizeChange(parseInt(target.value, 10) as PageSize);
		}
	}
</script>

{#if showPagination}
	<div class="flex flex-col space-y-4">
		<div class="flex justify-between items-center">
			<div class="flex items-center gap-2">
				<span class="text-sm text-muted-foreground">Items per page:</span>
				<select
					value={pageSize}
					on:change={handlePageSizeChange}
					{disabled}
					class="h-9 w-[80px] rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{#each PAGE_SIZE_OPTIONS as size}
						<option value={size}>
							{size}
						</option>
					{/each}
				</select>
			</div>

			<div class="flex gap-2">
				<Button
					variant="outline"
					size="sm"
					on:click={onPreviousPage}
					disabled={disabled || !hasPrevious}
				>
					<ChevronLeft class="h-4 w-4 mr-2" />
					Previous
				</Button>
				<Button variant="outline" size="sm" on:click={onNextPage} disabled={disabled || !hasNext}>
					Next
					<ChevronRight class="h-4 w-4 ml-2" />
				</Button>
			</div>
		</div>
	</div>
{/if}
