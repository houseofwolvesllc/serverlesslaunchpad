<script lang="ts">
	/**
	 * HalResourceRow - Renders a single row in a HAL collection table
	 *
	 * This component automatically renders table cells for each column using
	 * the appropriate field renderer based on the column type.
	 */

	import { Copy, Check } from 'lucide-svelte';
	import { formatDistanceToNow } from 'date-fns';
	import type { InferredColumn, HalObject } from '@houseofwolves/serverlesslaunchpad.web.commons';
	import { FieldType } from '@houseofwolves/serverlesslaunchpad.web.commons';
	import type { FieldRenderer } from './field_renderers';
	import { getFieldRenderer } from './field_renderers';
	import { cn } from '$lib/utils';

	// Props
	export let item: HalObject;
	export let columns: InferredColumn[];
	export let showCheckbox = false;
	export let selectable = false;
	export let selected = false;
	export let onToggleSelect: (() => void) | undefined = undefined;
	export let onRowClick: ((item: HalObject) => void) | undefined = undefined;
	export let customRenderers: Record<string, FieldRenderer> | undefined = undefined;

	// State
	let copiedField: string | null = null;

	function handleRowClick() {
		if (onRowClick) onRowClick(item);
	}

	function handleCheckboxClick(e: MouseEvent) {
		e.stopPropagation();
	}

	function handleCheckboxChange() {
		if (onToggleSelect) onToggleSelect();
	}

	async function handleCopy(value: string, fieldKey: string) {
		await navigator.clipboard.writeText(value);
		copiedField = fieldKey;
		setTimeout(() => (copiedField = null), 2000);
	}
</script>

<tr class={cn('border-b transition-colors', onRowClick && 'cursor-pointer hover:bg-muted/50')} on:click={handleRowClick}>
	<!-- Selection checkbox -->
	{#if showCheckbox}
		<td class="p-4 align-middle w-12" on:click={handleCheckboxClick}>
			<input
				type="checkbox"
				class="peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
				checked={selected}
				on:change={handleCheckboxChange}
				disabled={!selectable}
				aria-label="Select row"
			/>
		</td>
	{/if}

	<!-- Data cells -->
	{#each columns as column (column.key)}
		{@const value = item[column.key]}
		{@const customRenderer = getFieldRenderer(column, customRenderers)}
		<td style="width: {column.width}" class="p-4 align-middle">
			{#if customRenderer}
				<!-- Custom renderer -->
				{@const rendered = customRenderer(value, column, item)}
				{#if rendered.component}
					<svelte:component this={rendered.component} {...rendered.props} />
				{:else if rendered.html}
					{@html rendered.html}
				{/if}
			{:else if column.type === FieldType.CODE}
				<!-- Code field with copy button -->
				{#if value}
					<div class="flex items-center gap-2">
						<code class="text-xs font-mono bg-muted px-2 py-1 rounded break-all max-w-md">
							{value}
						</code>
						<button
							type="button"
							class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 w-7"
							on:click={(e) => {
								e.stopPropagation();
								handleCopy(String(value), column.key);
							}}
							title="Copy to clipboard"
						>
							{#if copiedField === column.key}
								<Check class="w-3.5 h-3.5 text-green-600" />
							{:else}
								<Copy class="w-3.5 h-3.5" />
							{/if}
						</button>
					</div>
				{:else}
					<span class="text-muted-foreground text-sm">{column.nullText || '—'}</span>
				{/if}
			{:else if column.type === FieldType.DATE}
				<!-- Date field with relative time -->
				{#if value}
					{@const date = new Date(value)}
					{#if !isNaN(date.getTime())}
						{#if column.key.toLowerCase().includes('last')}
							<span class="text-sm" title={date.toLocaleString()}>
								{formatDistanceToNow(date, { addSuffix: true })}
							</span>
						{:else}
							<span class="text-sm" title={date.toLocaleString()}>
								{date.toLocaleDateString('en-US', {
									month: 'short',
									day: 'numeric',
									year: 'numeric'
								})}
							</span>
						{/if}
					{:else}
						<span class="text-sm">{value}</span>
					{/if}
				{:else}
					<span class="text-muted-foreground text-xs">{column.nullText || 'Never'}</span>
				{/if}
			{:else if column.type === FieldType.BADGE}
				<!-- Badge field -->
				{#if value}
					{@const lower = String(value).toLowerCase()}
					{@const badgeClass =
						lower.includes('active') || lower.includes('success') || lower.includes('enabled')
							? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
							: lower.includes('error') || lower.includes('failed') || lower.includes('disabled')
								? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
								: lower.includes('pending') || lower.includes('warning')
									? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
									: 'bg-secondary text-secondary-foreground'}
					<span class={cn('inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors', badgeClass)}>
						{value}
					</span>
				{:else}
					<span class="text-muted-foreground text-sm">{column.nullText || '—'}</span>
				{/if}
			{:else if column.type === FieldType.BOOLEAN}
				<!-- Boolean field -->
				{@const isTrue = value === true || value === 'true' || value === 1}
				<span class={cn('inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors', isTrue ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-secondary text-secondary-foreground')}>
					{isTrue ? 'Yes' : 'No'}
				</span>
			{:else if column.type === FieldType.NUMBER}
				<!-- Number field -->
				{#if value !== null && value !== undefined}
					{@const num = Number(value)}
					{#if !isNaN(num)}
						<span class="text-sm font-mono tabular-nums">{num.toLocaleString()}</span>
					{:else}
						<span class="text-sm">{value}</span>
					{/if}
				{:else}
					<span class="text-muted-foreground text-sm">{column.nullText || '—'}</span>
				{/if}
			{:else if column.type === FieldType.EMAIL}
				<!-- Email field -->
				{#if value}
					<a
						href="mailto:{value}"
						class="text-sm font-medium text-primary underline-offset-4 hover:underline"
						on:click={(e) => e.stopPropagation()}
					>
						{value}
					</a>
				{:else}
					<span class="text-muted-foreground text-sm">{column.nullText || '—'}</span>
				{/if}
			{:else if column.type === FieldType.URL}
				<!-- URL field -->
				{#if value}
					{@const displayUrl =
						String(value).length > 50 ? String(value).substring(0, 47) + '...' : String(value)}
					<a
						href={value}
						target="_blank"
						rel="noopener noreferrer"
						class="text-sm font-medium text-primary underline-offset-4 hover:underline"
						on:click={(e) => e.stopPropagation()}
						title={value}
					>
						{displayUrl}
					</a>
				{:else}
					<span class="text-muted-foreground text-sm">{column.nullText || '—'}</span>
				{/if}
			{:else if column.type === FieldType.HIDDEN}
				<!-- Hidden field - render nothing -->
			{:else}
				<!-- Text field (default) -->
				{#if value !== null && value !== undefined && value !== ''}
					<span class="text-sm">{value}</span>
				{:else}
					<span class="text-muted-foreground text-sm">{column.nullText || '—'}</span>
				{/if}
			{/if}
		</td>
	{/each}
</tr>
