<script lang="ts">
	import { sidebarStore } from '$lib/stores/sidebar_store';
	import { authStore, authInitialized } from '$lib/stores/auth_store';
	import { verifySession, AuthError } from '$lib/auth';
	import { refreshCapabilities, getEntryPoint } from '$lib/services/entry_point_provider';
	import { getInitializationPromise } from '$lib/init';
	import { logger } from '$lib/logging';
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import AppSidebar from '$lib/components/dashboard/app-sidebar.svelte';
	import AppHeader from '$lib/components/dashboard/app-header.svelte';
	import { Root as SheetRoot } from '$lib/components/ui/sheet.svelte';
	import SheetContent from '$lib/components/ui/sheet-content.svelte';

	// Close mobile sheet when resizing to desktop to prevent state conflicts
	const DESKTOP_BREAKPOINT = 1024; // lg breakpoint
	let resizeCleanup: (() => void) | null = null;

	function handleResize() {
		if (browser && window.innerWidth >= DESKTOP_BREAKPOINT) {
			// Ensure mobile sheet is closed when on desktop
			sidebarStore.setMobileOpen(false);
		}
	}

	onMount(() => {
		if (browser) {
			window.addEventListener('resize', handleResize);
			resizeCleanup = () => window.removeEventListener('resize', handleResize);
			// Check initial size
			handleResize();
		}
	});

	onDestroy(() => {
		if (resizeCleanup) resizeCleanup();
	});

	// Initialize auth session on mount
	onMount(async () => {
		// Auto-login follows HATEOAS discovery pattern:
		// 1. Wait for entry point initialization
		// 2. Refresh capabilities to discover what templates are available
		// 3. Check if 'verify' template exists (indicates valid session)
		// 4. If present: verify session to get user details
		// 5. If absent: skip verification (no valid session)
		try {
			// STEP 0: Wait for entry point initialization to complete
			logger.debug('Waiting for entry point initialization');
			await getInitializationPromise();
			logger.debug('Entry point initialization complete');

			// STEP 1: Discover available capabilities from entry point
			logger.debug('Refreshing capabilities to discover authentication state');
			await refreshCapabilities();

			// STEP 2: Check if verify template exists (indicates valid session)
			const entryPoint = await getEntryPoint();
			const verifyTemplate = await entryPoint.getTemplate('verify');

			if (verifyTemplate) {
				// STEP 3: Valid session exists - verify to get full user details
				logger.debug('Verify template discovered, authenticating session');
				try {
					const user = await verifySession();
					authStore.setUser(user);
					logger.info('Session verified successfully', {
						hasSessionId: !!user.authContext?.sessionId
					});
				} catch (error) {
					// Session verification failed (400, 401, etc.) - session is invalid
					// Redirect to signin to get a fresh session
					logger.error('Session verification failed - redirecting to signin', { error });
					await goto('/auth/signin', { replaceState: true });
					return; // Stop execution to prevent authStore.setInitialized
				}
			} else {
				// No valid session - expected for new/logged-out users
				logger.debug('No verify template found - user is unauthenticated');
			}
		} catch (error) {
			// This should only catch unexpected errors (not 401s)
			logger.error('Unexpected error during authentication startup', { error });
		} finally {
			authStore.setInitialized(true);
			// Sitemap will auto-fetch via store subscription to auth changes
		}
	});

	$: mobileOpen = $sidebarStore.mobileOpen;
</script>

<div class="flex h-screen overflow-hidden">
	<!-- Desktop Sidebar -->
	<AppSidebar class="hidden lg:flex" />

	<!-- Main Content Area -->
	<div class="flex flex-1 flex-col overflow-hidden">
		<!-- Header -->
		<AppHeader />

		<!-- Page Content -->
		<main class="flex-1 overflow-y-auto bg-muted/30">
			<div class="container mx-auto p-6">
				{#if $authInitialized}
					<slot />
				{:else}
					<!-- Loading state while verifying auth -->
					<div class="animate-pulse space-y-4">
						<div class="h-8 bg-muted rounded w-1/4"></div>
						<div class="h-4 bg-muted rounded w-1/2"></div>
						<div class="h-64 bg-muted rounded"></div>
					</div>
				{/if}
			</div>
		</main>
	</div>

	<!-- Mobile Sheet -->
	<SheetRoot bind:open={mobileOpen}>
		<SheetContent side="left" class="p-0 w-60">
			<AppSidebar class="border-0" />
		</SheetContent>
	</SheetRoot>
</div>
