<script lang="ts">
	/**
	 * GenericResourceView - Catch-all route for HAL resources
	 *
	 * This component acts as a catch-all route handler that:
	 * - Fetches HAL resources from any path
	 * - Auto-detects collections vs single resources
	 * - Renders HalCollectionList for collections
	 * - Renders HalResourceDetail for single resources
	 * - Handles template execution with HATEOAS response-based navigation
	 * - Lets server response guide navigation (self links, collection detection)
	 * - Form and action templates are handled by child components
	 *
	 * URL Convention for GET vs POST:
	 * - URLs ending in `/list` are collection endpoints → POST
	 * - User-specific paths like `/users/{id}/xxx` → discover template from user resource
	 * - All other URLs → GET
	 *
	 * NOTE: The sitemap is ONLY used for building the navigation menu,
	 * NOT for determining how to fetch resources. This ensures HATEOAS
	 * works correctly for any user's resources, not just the current user.
	 */

	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import type { PageData } from './$types';
	import { onDestroy } from 'svelte';
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

	export let data: PageData;

	// Extract resource path from page data
	$: resourcePath = data.resourcePath;
	$: fullPath = `/${resourcePath}`;

	// Create HAL resource store - will auto-fetch when path changes
	let resourceStore: ReturnType<typeof createHalResource> | null = null;
	let unsubscribe: (() => void) | null = null;

	// Resource state
	let resourceData: HalObject | null = null;
	let resourceLoading = false;
	let resourceError: Error | null = null;

	// Reactive: Create new resource store when path changes
	// createHalResource uses URL convention to determine GET vs POST:
	// - /list suffix → POST
	// - /users/{id}/xxx paths → discover from user resource
	// - everything else → GET
	$: {
		if (fullPath) {
			// Clean up previous subscription
			if (unsubscribe) {
				unsubscribe();
				unsubscribe = null;
			}

			// Create new resource store - no sitemap dependency!
			// The hook determines GET vs POST based on URL convention
			resourceStore = createHalResource(fullPath);

			// Subscribe to resource store
			unsubscribe = resourceStore.subscribe((state) => {
				resourceData = state.data;
				resourceLoading = state.loading;
				resourceError = state.error;

				// Track resource in navigation history when loaded
				if (state.data && !state.loading && !state.error) {
					trackHalResource(state.data);
				}
			});
		}
	}

	// Clean up subscription on component destroy
	onDestroy(() => {
		if (unsubscribe) {
			unsubscribe();
		}
	});

	// Detect if this is a collection view
	$: isCollectionView = isCollection(resourceData);

	// Loading state
	$: isLoading = resourceLoading;

	/**
	 * Handle template execution with HATEOAS-based navigation
	 *
	 * Follows hypermedia principles: let the server response guide navigation
	 * instead of pre-determining it from the request.
	 *
	 * Navigation rules based on response:
	 * 1. Response has different self link → navigate to new resource location
	 * 2. Response is collection from detail view → navigate to collection endpoint
	 * 3. Otherwise (update, pagination) → refresh in place
	 */
	async function handleTemplateExecute(template: HalTemplate, formData: Record<string, any>) {
		try {
			logger.info('Executing template', { template: template.title, path: fullPath });

			// Execute the template and get the result
			const result = await executeTemplate(template, formData);

			// HATEOAS: Inspect response to determine navigation

			// 1. Check if result has a self link different from current location
			const selfLink = result._links?.self;
			const resultSelfHref = Array.isArray(selfLink) ? selfLink[0]?.href : selfLink?.href;

			if (resultSelfHref && resultSelfHref !== fullPath) {
				// Server told us this resource lives at a different location
				// (e.g., newly created resource, redirected endpoint)
				logger.info('Navigating to new resource location', {
					from: fullPath,
					to: resultSelfHref
				});
				const targetPath = resultSelfHref.replace(/^\//, '');
				await goto(`/${targetPath}`);
				return;
			}

			// 2. Check if result is a collection and target is different from current path
			const resultIsCollection = isCollection(result);

			if (resultIsCollection && template.target) {
				const targetFullPath = template.target;

				// If the target path is different from current path, navigate
				if (targetFullPath !== fullPath) {
					// Server returned a collection for a different endpoint
					// (e.g., clicking Sessions/API Keys from any page)
					// Navigate to the collection endpoint (URL-as-source-of-truth)
					logger.info('Navigating to collection endpoint', {
						from: fullPath,
						to: targetFullPath
					});
					const targetPath = targetFullPath.replace(/^\//, '');
					await goto(`/${targetPath}`);
					return;
				}
			}

			// 3. Default: Same resource updated or pagination in collection view
			// Refresh in place to show updated/next page data
			logger.info('Refreshing resource in place');
			if (resourceStore) {
				await resourceStore.refresh();
			}

			// Show success toast
			toastStore.success(template.title || 'Operation completed successfully');
		} catch (err) {
			logger.error('Template execution failed', { error: err });
			// Error toast is already shown by executeTemplate
			throw err;
		}
	}

	/**
	 * Handle refresh
	 */
	async function handleRefresh() {
		logger.info('Refreshing resource', { path: fullPath });
		if (resourceStore) {
			await resourceStore.refresh();
		}
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
		// This will be handled by the collection component
		// which will show a modal with the template form
		logger.info('Create action triggered');
	}
</script>

<svelte:head>
	<title>{resourcePath || 'Resource'}</title>
</svelte:head>

{#if resourceError}
	<!-- Error state - show NoMatch for errors -->
	<NoMatch title="Resource Not Found" message="The requested resource could not be found or you do not have permission to access it." />
{:else if isCollectionView}
	<!-- Collection view -->
	<div class="container mx-auto p-6">
		<HalCollectionList
			resource={resourceData}
			onRefresh={handleRefresh}
			onCreate={handleCreate}
			onRowClick={handleRowClick}
			onBulkDelete={(ids) => {
				const bulkDeleteTemplate = resourceData?._templates?.['bulk-delete'] || resourceData?._templates?.bulkDelete;
				if (bulkDeleteTemplate) {
					handleTemplateExecute(bulkDeleteTemplate, { [bulkDeleteTemplate.properties?.[0]?.name || 'ids']: ids });
				}
			}}
		/>
	</div>
{:else}
	<!-- Single resource view -->
	<HalResourceDetail
		resource={resourceData}
		loading={isLoading}
		error={resourceError}
		onRefresh={handleRefresh}
		onTemplateExecute={handleTemplateExecute}
	/>
{/if}
