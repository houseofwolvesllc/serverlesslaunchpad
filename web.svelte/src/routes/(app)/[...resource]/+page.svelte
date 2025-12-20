<script lang="ts">
	/**
	 * GenericResourceView - Catch-all route for HAL resources
	 *
	 * This component acts as a catch-all route handler that:
	 * - Checks the component registry for dedicated feature components
	 * - Falls back to generic HAL rendering for unknown resource types
	 * - Auto-detects collections vs single resources
	 * - Renders HalCollectionList for collections
	 * - Renders HalResourceDetail for single resources
	 * - Handles template execution with HATEOAS response-based navigation
	 * - Lets server response guide navigation (self links, collection detection)
	 * - Form and action templates are handled by child components
	 *
	 * Component Registry Pattern:
	 * - Menu navigation passes `navigationRel` in page state
	 * - Registry lookup uses rel first, then URL pattern matching
	 * - Dedicated components get full bulk operation support
	 * - Generic view handles unknown resources without bulk ops
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
	import { logger } from '$lib/logging';
	import { getComponentForResource } from '$lib/routing/component_registry';
	import HalCollectionList from '$lib/components/hal_collection/HalCollectionList.svelte';
	import HalResourceDetail from '$lib/components/hal_resource/HalResourceDetail.svelte';
	import NoMatch from '$lib/components/ui/no_match.svelte';

	// Import dedicated components from lib
	import SessionsPage from '$lib/components/sessions/SessionsPage.svelte';
	import ApiKeysPage from '$lib/components/api-keys/ApiKeysPage.svelte';

	export let data: PageData;

	// Extract resource path from page data
	$: resourcePath = data.resourcePath;
	$: fullPath = `/${resourcePath}`;

	// Get navigation rel from page state (passed by menu navigation)
	$: navigationRel = ($page.state as { navigationRel?: string })?.navigationRel;

	// Check component registry for dedicated component
	$: registryEntry = getComponentForResource(navigationRel, fullPath);

	// Map rel to actual component (since we can't dynamically import in Svelte easily)
	$: DedicatedComponent = registryEntry
		? getDedicatedComponent(navigationRel, fullPath)
		: null;

	/**
	 * Get the dedicated component for a resource
	 * This maps the registry entry to actual Svelte components
	 */
	function getDedicatedComponent(rel: string | undefined, url: string) {
		// Try rel match first
		if (rel === 'sessions') return SessionsPage;
		if (rel === 'api-keys') return ApiKeysPage;

		// Try URL pattern matching
		if (/\/sessions\/list$/.test(url) || /^\/sessions$/.test(url)) return SessionsPage;
		if (/\/api-keys\/list$/.test(url) || /^\/api-keys$/.test(url)) return ApiKeysPage;

		return null;
	}

	// Log component resolution for debugging
	$: {
		logger.info('Generic route component resolution', {
			fullPath,
			navigationRel,
			hasDedicatedComponent: !!DedicatedComponent,
			componentName: DedicatedComponent?.name || 'GenericView'
		});
	}

	// Create HAL resource store - will auto-fetch when path changes
	let resourceStore: ReturnType<typeof createHalResource> | null = null;
	let unsubscribe: (() => void) | null = null;

	// Resource state
	let resourceData: HalObject | null = null;
	let resourceLoading = false;
	let resourceError: Error | null = null;

	// Reactive: Create new resource store when path changes
	// Always fetch the resource - dedicated components need it passed as a prop
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

			// Note: Success toast is already shown by HalResourceDetail component
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

{#if DedicatedComponent && resourceData}
	<!-- Dedicated component from registry - receives resource prop for HATEOAS compliance -->
	<svelte:component this={DedicatedComponent} resource={resourceData} onRefresh={handleRefresh} />
{:else if DedicatedComponent && resourceLoading}
	<!-- Loading state for dedicated component -->
	<div class="container mx-auto p-6">
		<div class="animate-pulse space-y-4">
			<div class="h-8 bg-muted rounded w-1/4"></div>
			<div class="h-4 bg-muted rounded w-1/2"></div>
			<div class="h-64 bg-muted rounded"></div>
		</div>
	</div>
{:else if resourceError}
	<!-- Error state - show NoMatch for errors -->
	<NoMatch title="Resource Not Found" message="The requested resource could not be found or you do not have permission to access it." />
{:else if isCollectionView}
	<!-- Collection view -->
	<!-- Note: No bulkOperations passed - generic view doesn't support bulk ops -->
	<!-- For bulk operations, use dedicated feature pages (e.g., /sessions, /api-keys) -->
	<div class="container mx-auto p-6">
		<HalCollectionList
			resource={resourceData}
			onRefresh={handleRefresh}
			onCreate={handleCreate}
			onRowClick={handleRowClick}
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
