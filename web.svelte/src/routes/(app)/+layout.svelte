<script lang="ts">
	import { sidebarStore } from '$lib/stores/sidebar_store';
	import { authStore } from '$lib/stores/auth_store';
	import { verifySession, AuthError } from '$lib/auth';
	import { refreshCapabilities } from '$lib/services/entry_point_provider';
	import { logger } from '$lib/logging';
	import { onMount } from 'svelte';
	import AppSidebar from '$lib/components/dashboard/app-sidebar.svelte';
	import AppHeader from '$lib/components/dashboard/app-header.svelte';
	import { Root as SheetRoot } from '$lib/components/ui/sheet.svelte';
	import SheetContent from '$lib/components/ui/sheet-content.svelte';

	// Initialize auth session on mount
	onMount(async () => {
		// Try to verify existing session
		try {
			const user = await verifySession();
			authStore.setUser(user);
			logger.debug('Session restored from API', {
				hasSessionId: !!user.authContext?.sessionId
			});
		} catch (error) {
			if (!(error instanceof AuthError)) {
				logger.error('Unexpected error during session verification', { error });
			}
			// Refresh capabilities to get unauthenticated templates
			try {
				await refreshCapabilities();
				logger.debug('Capabilities refreshed to unauthenticated state');
			} catch (refreshError) {
				logger.error('Failed to refresh capabilities', { error: refreshError });
			}
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
				<slot />
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
