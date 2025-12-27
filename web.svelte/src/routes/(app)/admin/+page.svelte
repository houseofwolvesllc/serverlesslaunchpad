<script lang="ts">
	/**
	 * Admin Page - Administrative interface
	 *
	 * This component provides access to administrative functions by:
	 * - Fetching the /admin HAL resource
	 * - Auto-detecting collections vs single resources
	 * - Rendering HalCollectionList for collections
	 * - Rendering HalResourceDetail for single resources
	 * - Handling admin-specific templates and operations
	 */

	import { goto } from '$app/navigation';
	import type { HalObject, HalTemplate } from '@houseofwolves/serverlesslaunchpad.types/hal';
	import { isCollection } from '@houseofwolves/serverlesslaunchpad.web.commons';
	import { createHalResource } from '$lib/hooks/use_hal_resource';
	import { executeTemplate } from '$lib/hooks/use_template';
	import { trackHalResource } from '$lib/utils/hal_resource_tracking';
	import { toastStore } from '$lib/stores/toast_store';
	import { logger } from '$lib/logging';
	import HalCollectionList from '$lib/components/hal_collection/HalCollectionList.svelte';
	import HalResourceDetail from '$lib/components/hal_resource/HalResourceDetail.svelte';
	import NoMatch from '$lib/components/ui/no_match.svelte';
	import { onDestroy } from 'svelte';
	import { ShieldAlert } from 'lucide-svelte';

	const adminPath = '/admin';

	// Create HAL resource store for admin endpoint
	let resource = createHalResource(adminPath);
	let unsubscribe: (() => void) | null = null;

	// Resource state
	let resourceData: HalObject | null = null;
	let resourceLoading = false;
	let resourceError: Error | null = null;

	// Subscribe to resource store
	unsubscribe = resource.subscribe((state) => {
		resourceData = state.data;
		resourceLoading = state.loading;
		resourceError = state.error;

		// Track resource in navigation history when loaded
		if (state.data && !state.loading && !state.error) {
			trackHalResource(state.data);
		}
	});

	// Clean up subscription on component destroy
	onDestroy(() => {
		if (unsubscribe) {
			unsubscribe();
		}
	});

	// Detect if this is a collection view
	$: isCollectionView = isCollection(resourceData);

	/**
	 * Handle template execution with HATEOAS-based navigation
	 */
	async function handleTemplateExecute(template: HalTemplate, formData: Record<string, any>) {
		try {
			logger.info('Executing admin template', { template: template.title });

			// Execute the template and get the result
			const result = await executeTemplate(template, formData);

			// HATEOAS: Inspect response to determine navigation

			// 1. Check if result has a self link different from current location
			const selfLink = result._links?.self;
			const resultSelfHref = Array.isArray(selfLink) ? selfLink[0]?.href : selfLink?.href;

			if (resultSelfHref && resultSelfHref !== adminPath) {
				// Navigate to new resource location
				logger.info('Navigating to new resource location', {
					from: adminPath,
					to: resultSelfHref
				});
				const targetPath = resultSelfHref.replace(/^\//, '');
				await goto(`/${targetPath}`);
				return;
			}

			// 2. Check if result is a collection and target is different from current path
			const resultIsCollection = isCollection(result);

			if (resultIsCollection && template.target && template.target !== adminPath) {
				// Navigate to the collection endpoint
				logger.info('Navigating to collection endpoint', {
					from: adminPath,
					to: template.target
				});
				const targetPath = template.target.replace(/^\//, '');
				await goto(`/${targetPath}`);
				return;
			}

			// 3. Default: Refresh in place
			logger.info('Refreshing admin resource in place');
			await resource.refresh();

			// Show success toast
			toastStore.success(template.title || 'Operation completed successfully');
		} catch (err) {
			logger.error('Admin template execution failed', { error: err });
			// Error toast is already shown by executeTemplate
			throw err;
		}
	}

	/**
	 * Handle refresh
	 */
	async function handleRefresh() {
		logger.info('Refreshing admin resource');
		await resource.refresh();
	}

	/**
	 * Handle row click (navigate to detail view)
	 */
	function handleRowClick(item: HalObject) {
		// Find the self link or construct path from ID
		const selfLink = item._links?.self;
		const selfHref = Array.isArray(selfLink) ? selfLink[0]?.href : selfLink?.href;
		if (selfHref) {
			logger.info('Navigating to resource detail', { href: selfHref });
			const path = selfHref.replace(/^\//, '');
			goto(`/${path}`);
		}
	}

	/**
	 * Handle create action (for collections)
	 */
	function handleCreate() {
		logger.info('Admin create action triggered');
	}
</script>

<svelte:head>
	<title>Admin</title>
</svelte:head>

<div class="p-6">
	<div class="space-y-6">
		<!-- Header -->
		<div class="space-y-2">
			<div class="flex items-center gap-3">
				<div class="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
					<ShieldAlert class="h-6 w-6 text-primary" />
				</div>
				<div>
					<h1 class="text-3xl font-bold tracking-tight">Admin</h1>
					<p class="text-muted-foreground">Administrative functions and settings</p>
				</div>
			</div>
		</div>

		<!-- Resource View -->
		{#if resourceError}
			<!-- Error state - show NoMatch for errors -->
			<NoMatch
				title="Access Denied"
				message="You do not have permission to access administrative functions, or the admin resource could not be found."
			/>
		{:else if isCollectionView}
			<!-- Collection view -->
			<HalCollectionList
				resource={resourceData}
				onRefresh={handleRefresh}
				onCreate={handleCreate}
				onRowClick={handleRowClick}
			/>
		{:else}
			<!-- Single resource view -->
			<HalResourceDetail
				resource={resourceData}
				loading={resourceLoading}
				error={resourceError}
				onRefresh={handleRefresh}
				onTemplateExecute={handleTemplateExecute}
			/>
		{/if}
	</div>
</div>
