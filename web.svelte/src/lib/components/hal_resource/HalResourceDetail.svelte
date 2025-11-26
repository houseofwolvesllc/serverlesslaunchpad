<script lang="ts">
	/**
	 * HalResourceDetail - Renders a single HAL resource with inferred field types
	 *
	 * This component automatically displays a resource in a card-based layout with:
	 * - Breadcrumb navigation (Home → Current page)
	 * - Field display sections (Overview, Details)
	 * - Template actions section with categorization
	 * - Type-based field rendering
	 * - Form modals for update/edit templates
	 * - Confirmation dialogs for action templates
	 * - Filtered delete operations (only in list views)
	 */

	import { RefreshCw, AlertCircle, Copy, Check } from 'lucide-svelte';
	import { formatDistanceToNow } from 'date-fns';
	import {
		extractResourceFields,
		humanizeLabel,
		type HalObject,
		type InferredColumn,
		type InferenceOptions,
		categorizeTemplate,
		buildTemplateData,
		getConfirmationConfig,
		type TemplateExecutionContext,
		FieldType
	} from '@houseofwolves/serverlesslaunchpad.web.commons';
	import type { HalTemplate } from '@houseofwolves/serverlesslaunchpad.types/hal';
	import Card from '$lib/components/ui/card.svelte';
	import CardContent from '$lib/components/ui/card-content.svelte';
	import CardHeader from '$lib/components/ui/card-header.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import Badge from '$lib/components/ui/badge.svelte';
	import Skeleton from '$lib/components/ui/skeleton.svelte';
	import Alert from '$lib/components/ui/alert.svelte';
	import Dialog from '$lib/components/ui/dialog.svelte';
	import DialogContent from '$lib/components/ui/dialog-content.svelte';
	import DialogHeader from '$lib/components/ui/dialog-header.svelte';
	import DialogTitle from '$lib/components/ui/dialog-title.svelte';
	import DialogDescription from '$lib/components/ui/dialog-description.svelte';
	import AlertDialog from '$lib/components/ui/alert-dialog.svelte';
	import AlertDialogContent from '$lib/components/ui/alert-dialog-content.svelte';
	import AlertDialogHeader from '$lib/components/ui/alert-dialog-header.svelte';
	import AlertDialogTitle from '$lib/components/ui/alert-dialog-title.svelte';
	import AlertDialogDescription from '$lib/components/ui/alert-dialog-description.svelte';
	import AlertDialogFooter from '$lib/components/ui/alert-dialog-footer.svelte';
	import AlertDialogCancel from '$lib/components/ui/alert-dialog-cancel.svelte';
	import AlertDialogAction from '$lib/components/ui/alert-dialog-action.svelte';
	import TemplateForm from '$lib/components/hal_forms/template_form.svelte';
	import type { FieldRenderer } from '$lib/components/hal_collection/field_renderers';
	import { getFieldRenderer } from '$lib/components/hal_collection/field_renderers';
	import { toast } from 'svelte-sonner';
	import { cn } from '$lib/utils';

	// Props
	export let resource: HalObject | null | undefined;
	export let fieldConfig: InferenceOptions = {};
	export let customRenderers: Record<string, FieldRenderer> | undefined = undefined;
	export let onRefresh: (() => void) | undefined = undefined;
	export let onTemplateExecute: ((template: any, data: any) => Promise<void>) | undefined = undefined;
	export let loading = false;
	export let error: Error | null = null;

	// State
	let executingTemplate: string | null = null;
	let copiedField: string | null = null;

	// Form dialog state
	let formDialogOpen = false;
	let formTemplate: HalTemplate | null = null;
	let formTemplateKey: string | null = null;

	// Confirmation dialog state
	let confirmDialogOpen = false;
	let confirmTemplate: HalTemplate | null = null;
	let confirmContext: TemplateExecutionContext | null = null;
	let confirmConfig: ReturnType<typeof getConfirmationConfig> | null = null;

	// Reactive fields extraction
	$: allFields = resource ? extractResourceFields(resource, fieldConfig) : [];

	// Separate fields into overview (primary identifiers) and details (everything else)
	$: overviewFields = allFields.filter(
		(field) => /^(name|title|label)$/i.test(field.key) && !field.hidden
	);

	$: detailFields = allFields.filter(
		(field) => !/^(name|title|label)$/i.test(field.key) && !field.hidden
	);

	// Extract page title from resource
	$: pageTitle = getPageTitle();

	function getPageTitle(): string {
		if (!resource) return 'Resource';

		// First priority: self link title
		const selfLink = resource._links?.self;
		if (selfLink) {
			const selfTitle = Array.isArray(selfLink) ? selfLink[0]?.title : selfLink.title;
			if (selfTitle) return selfTitle;
		}

		// Second priority: common title fields
		const titleField = resource.title || resource.name || resource.label;
		if (titleField) return String(titleField);

		// Third priority: first non-empty field
		for (const field of overviewFields) {
			const value = resource[field.key];
			if (value) return String(value);
		}

		return 'Resource Details';
	}

	// Extract templates for actions (filter out navigation and delete operations)
	$: templates = resource?._templates || {};
	$: templateEntries = Object.entries(templates).filter(([key, template]) => {
		// Filter out navigation templates (self, default)
		if (key === 'default' || key === 'self') return false;

		// Filter out delete operations (they belong in list views only)
		if (key === 'delete' || (template as HalTemplate).method === 'DELETE') return false;

		return true;
	});

	// Execute template with context
	async function executeTemplate(
		template: HalTemplate,
		context: TemplateExecutionContext,
		showToast: boolean = true
	) {
		if (!onTemplateExecute) return;

		try {
			const data = buildTemplateData(context);
			await onTemplateExecute(template, data);

			// Refresh to get updated data
			if (onRefresh) {
				await onRefresh();
			}

			// Only show success toast for non-navigation templates
			if (showToast) {
				toast.success(template.title || 'Action completed');
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Operation failed';
			// Only show error toast for non-navigation templates
			if (showToast) {
				toast.error(message);
			}
			throw err;
		}
	}

	// Handle template button click with categorization
	async function handleTemplateClick(templateKey: string, template: HalTemplate) {
		if (!onTemplateExecute) return;

		const category = categorizeTemplate(templateKey, template);

		// Categorize and handle accordingly
		if (category === 'navigation') {
			// Navigation templates: execute immediately (shouldn't happen in detail view)
			const context: TemplateExecutionContext = {
				template,
				resource
			};
			executingTemplate = templateKey;
			try {
				// Don't show toast for navigation templates
				await executeTemplate(template, context, false);
			} finally {
				executingTemplate = null;
			}
		} else if (category === 'form') {
			// Form templates: show form dialog
			formTemplate = template;
			formTemplateKey = templateKey;
			formDialogOpen = true;
		} else {
			// Action templates: show confirmation dialog
			const context: TemplateExecutionContext = {
				template,
				resource
			};
			confirmTemplate = template;
			confirmContext = context;
			confirmConfig = getConfirmationConfig(template, context);
			confirmDialogOpen = true;
		}
	}

	// Handle form dialog submit
	async function handleFormSubmit(event: CustomEvent<Record<string, any>>) {
		if (!formTemplate) return;

		executingTemplate = formTemplateKey || 'form';

		try {
			const context: TemplateExecutionContext = {
				template: formTemplate,
				formData: event.detail,
				resource
			};

			await executeTemplate(formTemplate, context);
			formDialogOpen = false;
			formTemplate = null;
			formTemplateKey = null;
		} finally {
			executingTemplate = null;
		}
	}

	// Handle confirmation dialog confirm
	async function handleConfirmAction() {
		if (!confirmTemplate || !confirmContext) return;

		const templateKey = Object.keys(templates).find((key) => templates[key] === confirmTemplate);

		executingTemplate = templateKey || 'action';

		try {
			await executeTemplate(confirmTemplate, confirmContext);
			confirmDialogOpen = false;
			confirmTemplate = null;
			confirmContext = null;
			confirmConfig = null;
		} finally {
			executingTemplate = null;
		}
	}

	// Copy to clipboard
	async function handleCopy(value: string, fieldKey: string) {
		await navigator.clipboard.writeText(value);
		copiedField = fieldKey;
		setTimeout(() => (copiedField = null), 2000);
	}

	// Render a single field
	function renderFieldValue(field: InferredColumn, value: any): any {
		const customRenderer = getFieldRenderer(field, customRenderers);

		if (customRenderer) {
			return customRenderer(value, field, resource);
		}

		return null;
	}
</script>

{#if loading}
	<!-- Loading state -->
	<div class="space-y-6">
		<!-- Breadcrumb skeleton -->
		<div class="flex items-center gap-2">
			<Skeleton class="h-4 w-16" />
			<Skeleton class="h-4 w-4" />
			<Skeleton class="h-4 w-32" />
		</div>

		<!-- Header skeleton -->
		<div class="space-y-2">
			<Skeleton class="h-8 w-48" />
			<div class="flex gap-2">
				<Skeleton class="h-9 w-24" />
				<Skeleton class="h-9 w-24" />
			</div>
		</div>

		<!-- Content skeleton -->
		<Card>
			<CardHeader>
				<Skeleton class="h-6 w-32" />
			</CardHeader>
			<CardContent class="space-y-4">
				<Skeleton class="h-16 w-full" />
				<Skeleton class="h-16 w-full" />
				<Skeleton class="h-16 w-full" />
			</CardContent>
		</Card>
	</div>
{:else if error}
	<!-- Error state -->
	<div class="space-y-6">
		<!-- Error alert -->
		<Alert variant="destructive">
			<AlertCircle class="h-4 w-4" />
			<h5 class="mb-1 font-medium leading-none tracking-tight">Error Loading Resource</h5>
			<div class="text-sm [&_p]:leading-relaxed">
				{error.message || 'Failed to load resource. Please try again.'}
			</div>
		</Alert>

		{#if onRefresh}
			<Button on:click={onRefresh} variant="outline">
				<RefreshCw class="mr-2 h-4 w-4" />
				Try Again
			</Button>
		{/if}
	</div>
{:else if !resource}
	<!-- No resource state -->
	<div class="space-y-6">
		<Alert>
			<AlertCircle class="h-4 w-4" />
			<h5 class="mb-1 font-medium leading-none tracking-tight">No Resource</h5>
			<div class="text-sm [&_p]:leading-relaxed">No resource data available.</div>
		</Alert>
	</div>
{:else}
	<!-- Main content -->
	<div class="space-y-6">
		<!-- Page Header -->
		<div class="space-y-1">
			<h1 class="text-3xl font-bold tracking-tight">{pageTitle}</h1>
			{#if resource.email}
				<p class="text-muted-foreground">
					{resource.email}
				</p>
			{/if}
		</div>

		<!-- Action toolbar -->
		<div class="flex items-center justify-end gap-2">
			<!-- Template action buttons -->
			{#each templateEntries as [key, template] (key)}
				<Button
					variant="outline"
					size="sm"
					on:click={() => handleTemplateClick(key, template as HalTemplate)}
					disabled={executingTemplate === key}
				>
					{executingTemplate === key ? 'Executing...' : (template as any).title || humanizeLabel(key)}
				</Button>
			{/each}

			{#if onRefresh}
				<Button variant="outline" on:click={onRefresh} size="sm">
					<RefreshCw class="mr-2 h-4 w-4" />
					Refresh
				</Button>
			{/if}
		</div>

		<!-- Overview Section (Primary Fields) -->
		{#if overviewFields.length > 0}
			<Card>
				<CardHeader>
					<h3 class="text-2xl font-semibold leading-none tracking-tight">Overview</h3>
					<p class="text-sm text-muted-foreground">Primary identifying information</p>
				</CardHeader>
				<CardContent>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						{#each overviewFields as field (field.key)}
							{@const value = resource[field.key]}
							{@const customRender = renderFieldValue(field, value)}
							<div class="space-y-1">
								<label class="text-sm font-medium text-muted-foreground">
									{field.label}
								</label>
								<div class="text-sm">
									{#if customRender}
										{#if customRender.component}
											<svelte:component this={customRender.component} {...customRender.props} />
										{:else if customRender.html}
											{@html customRender.html}
										{/if}
									{:else if field.type === FieldType.CODE}
										{#if value}
											<div class="flex items-center gap-2">
												<code class="text-xs font-mono bg-muted px-2 py-1 rounded break-all max-w-md">
													{String(value)}
												</code>
												<button
													type="button"
													class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 w-7"
													on:click={() => handleCopy(String(value), field.key)}
													title="Copy to clipboard"
												>
													{#if copiedField === field.key}
														<Check class="h-3.5 w-3.5 text-green-600" />
													{:else}
														<Copy class="h-3.5 w-3.5" />
													{/if}
												</button>
											</div>
										{:else}
											<span class="text-muted-foreground text-sm">{field.nullText || '—'}</span>
										{/if}
									{:else if field.type === FieldType.DATE}
										{#if value}
											{@const date = new Date(value)}
											{#if !isNaN(date.getTime())}
												{#if field.key.toLowerCase().includes('last')}
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
												<span class="text-sm">{String(value)}</span>
											{/if}
										{:else}
											<span class="text-muted-foreground text-xs">{field.nullText || 'Never'}</span>
										{/if}
									{:else if field.type === FieldType.BADGE}
										{#if value !== null && value !== undefined && value !== ''}
											{@const lower = String(value).toLowerCase()}
											{@const variant = lower.includes('active') || lower.includes('success') || lower.includes('enabled')
												? 'default'
												: lower.includes('error') || lower.includes('failed') || lower.includes('disabled')
													? 'destructive'
													: lower.includes('pending') || lower.includes('warning')
														? 'outline'
														: 'secondary'}
											<Badge {variant} class="text-xs">
												{String(value)}
											</Badge>
										{:else}
											<span class="text-muted-foreground text-sm">{field.nullText || '—'}</span>
										{/if}
									{:else if field.type === FieldType.BOOLEAN}
										{@const isTrue = value === true || value === 'true' || value === 1}
										<Badge variant={isTrue ? 'default' : 'secondary'} class="text-xs">
											{isTrue ? 'Yes' : 'No'}
										</Badge>
									{:else if field.type === FieldType.NUMBER}
										{#if value !== null && value !== undefined}
											{@const num = Number(value)}
											{#if !isNaN(num)}
												<span class="text-sm tabular-nums">{num.toLocaleString()}</span>
											{:else}
												<span class="text-sm">{String(value)}</span>
											{/if}
										{:else}
											<span class="text-muted-foreground text-sm">{field.nullText || '—'}</span>
										{/if}
									{:else if field.type === FieldType.EMAIL}
										{#if value}
											<a
												href="mailto:{value}"
												class="text-sm text-primary hover:underline"
												on:click={(e) => e.stopPropagation()}
											>
												{String(value)}
											</a>
										{:else}
											<span class="text-muted-foreground text-sm">{field.nullText || '—'}</span>
										{/if}
									{:else if field.type === FieldType.URL}
										{#if value}
											{@const displayUrl =
												String(value).length > 50 ? String(value).substring(0, 47) + '...' : String(value)}
											<a
												href={String(value)}
												target="_blank"
												rel="noopener noreferrer"
												class="text-sm text-primary hover:underline"
												on:click={(e) => e.stopPropagation()}
												title={String(value)}
											>
												{displayUrl}
											</a>
										{:else}
											<span class="text-muted-foreground text-sm">{field.nullText || '—'}</span>
										{/if}
									{:else}
										<!-- Text field (default) -->
										{#if value !== null && value !== undefined && value !== ''}
											{#if Array.isArray(value)}
												{#if value.length === 0}
													<span class="text-muted-foreground text-sm">{field.nullText || 'None'}</span>
												{:else}
													<div class="flex flex-wrap gap-1">
														{#each value as val}
															<Badge variant="secondary" class="text-xs">
																{String(val)}
															</Badge>
														{/each}
													</div>
												{/if}
											{:else}
												<span class="text-sm">{String(value)}</span>
											{/if}
										{:else}
											<span class="text-muted-foreground text-sm">{field.nullText || '—'}</span>
										{/if}
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</CardContent>
			</Card>
		{/if}

		<!-- Details Section (All Other Fields) -->
		{#if detailFields.length > 0}
			<Card>
				<CardHeader>
					<h3 class="text-2xl font-semibold leading-none tracking-tight">Details</h3>
					<p class="text-sm text-muted-foreground">All resource fields</p>
				</CardHeader>
				<CardContent>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						{#each detailFields as field (field.key)}
							{@const value = resource[field.key]}
							{@const customRender = renderFieldValue(field, value)}
							<div class="space-y-1">
								<label class="text-sm font-medium text-muted-foreground">
									{field.label}
								</label>
								<div class="text-sm">
									{#if customRender}
										{#if customRender.component}
											<svelte:component this={customRender.component} {...customRender.props} />
										{:else if customRender.html}
											{@html customRender.html}
										{/if}
									{:else if field.type === FieldType.CODE}
										{#if value}
											<div class="flex items-center gap-2">
												<code class="text-xs font-mono bg-muted px-2 py-1 rounded break-all max-w-md">
													{String(value)}
												</code>
												<button
													type="button"
													class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 w-7"
													on:click={() => handleCopy(String(value), field.key)}
													title="Copy to clipboard"
												>
													{#if copiedField === field.key}
														<Check class="h-3.5 w-3.5 text-green-600" />
													{:else}
														<Copy class="h-3.5 w-3.5" />
													{/if}
												</button>
											</div>
										{:else}
											<span class="text-muted-foreground text-sm">{field.nullText || '—'}</span>
										{/if}
									{:else if field.type === FieldType.DATE}
										{#if value}
											{@const date = new Date(value)}
											{#if !isNaN(date.getTime())}
												{#if field.key.toLowerCase().includes('last')}
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
												<span class="text-sm">{String(value)}</span>
											{/if}
										{:else}
											<span class="text-muted-foreground text-xs">{field.nullText || 'Never'}</span>
										{/if}
									{:else if field.type === FieldType.BADGE}
										{#if value !== null && value !== undefined && value !== ''}
											{@const lower = String(value).toLowerCase()}
											{@const variant = lower.includes('active') || lower.includes('success') || lower.includes('enabled')
												? 'default'
												: lower.includes('error') || lower.includes('failed') || lower.includes('disabled')
													? 'destructive'
													: lower.includes('pending') || lower.includes('warning')
														? 'outline'
														: 'secondary'}
											<Badge {variant} class="text-xs">
												{String(value)}
											</Badge>
										{:else}
											<span class="text-muted-foreground text-sm">{field.nullText || '—'}</span>
										{/if}
									{:else if field.type === FieldType.BOOLEAN}
										{@const isTrue = value === true || value === 'true' || value === 1}
										<Badge variant={isTrue ? 'default' : 'secondary'} class="text-xs">
											{isTrue ? 'Yes' : 'No'}
										</Badge>
									{:else if field.type === FieldType.NUMBER}
										{#if value !== null && value !== undefined}
											{@const num = Number(value)}
											{#if !isNaN(num)}
												<span class="text-sm tabular-nums">{num.toLocaleString()}</span>
											{:else}
												<span class="text-sm">{String(value)}</span>
											{/if}
										{:else}
											<span class="text-muted-foreground text-sm">{field.nullText || '—'}</span>
										{/if}
									{:else if field.type === FieldType.EMAIL}
										{#if value}
											<a
												href="mailto:{value}"
												class="text-sm text-primary hover:underline"
												on:click={(e) => e.stopPropagation()}
											>
												{String(value)}
											</a>
										{:else}
											<span class="text-muted-foreground text-sm">{field.nullText || '—'}</span>
										{/if}
									{:else if field.type === FieldType.URL}
										{#if value}
											{@const displayUrl =
												String(value).length > 50 ? String(value).substring(0, 47) + '...' : String(value)}
											<a
												href={String(value)}
												target="_blank"
												rel="noopener noreferrer"
												class="text-sm text-primary hover:underline"
												on:click={(e) => e.stopPropagation()}
												title={String(value)}
											>
												{displayUrl}
											</a>
										{:else}
											<span class="text-muted-foreground text-sm">{field.nullText || '—'}</span>
										{/if}
									{:else}
										<!-- Text field (default) -->
										{#if value !== null && value !== undefined && value !== ''}
											{#if Array.isArray(value)}
												{#if value.length === 0}
													<span class="text-muted-foreground text-sm">{field.nullText || 'None'}</span>
												{:else}
													<div class="flex flex-wrap gap-1">
														{#each value as val}
															<Badge variant="secondary" class="text-xs">
																{String(val)}
															</Badge>
														{/each}
													</div>
												{/if}
											{:else}
												<span class="text-sm">{String(value)}</span>
											{/if}
										{:else}
											<span class="text-muted-foreground text-sm">{field.nullText || '—'}</span>
										{/if}
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</CardContent>
			</Card>
		{/if}
	</div>
{/if}

<!-- Form Dialog for update/edit templates -->
{#if formTemplate}
	<Dialog bind:open={formDialogOpen}>
		<DialogContent>
			<DialogHeader>
				<DialogTitle>
					{formTemplate.title || humanizeLabel(formTemplateKey || '')}
				</DialogTitle>
				<DialogDescription>Fill out the form below and submit.</DialogDescription>
			</DialogHeader>
			<TemplateForm
				template={formTemplate}
				on:submit={handleFormSubmit}
				onCancel={() => {
					formDialogOpen = false;
					formTemplate = null;
					formTemplateKey = null;
				}}
				loading={executingTemplate !== null}
			/>
		</DialogContent>
	</Dialog>
{/if}

<!-- Confirmation Dialog for action templates -->
{#if confirmTemplate && confirmContext && confirmConfig}
	<AlertDialog bind:open={confirmDialogOpen}>
		<AlertDialogContent>
			<AlertDialogHeader>
				<AlertDialogTitle>{confirmConfig.title}</AlertDialogTitle>
				<AlertDialogDescription>{confirmConfig.message}</AlertDialogDescription>
			</AlertDialogHeader>
			<AlertDialogFooter>
				<AlertDialogCancel
					on:click={() => {
						if (!executingTemplate) {
							confirmDialogOpen = false;
							confirmTemplate = null;
							confirmContext = null;
							confirmConfig = null;
						}
					}}
					disabled={executingTemplate !== null}
				>
					{confirmConfig.cancelLabel || 'Cancel'}
				</AlertDialogCancel>
				<AlertDialogAction
					on:click={handleConfirmAction}
					disabled={executingTemplate !== null}
					class={confirmConfig.variant === 'destructive'
						? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
						: ''}
				>
					{executingTemplate ? 'Loading...' : confirmConfig.confirmLabel || 'Confirm'}
				</AlertDialogAction>
			</AlertDialogFooter>
		</AlertDialogContent>
	</AlertDialog>
{/if}
