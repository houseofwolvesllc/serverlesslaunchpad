<script lang="ts">
	import { sidebarStore } from '$lib/stores/sidebar_store';
	import { sitemapStore } from '$lib/stores/sitemap_store';
	import { navigationHistoryStore } from '$lib/stores/navigation_history_store';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth_store';
	import { onMount } from 'svelte';
	import webConfigStore from '$lib/config/web_config_store';
	import {
		Home,
		Key,
		Clock,
		BookOpen,
		User,
		LogOut,
		ChevronRight
	} from 'lucide-svelte';
	import { toastStore } from '$lib/stores/toast_store';
	import { cn } from '$lib/utils';

	let className: string | undefined = undefined;
	export { className as class };

	// Track open state for each collapsible menu group by label
	let openMenuGroups: Record<string, boolean> = {
		'My Account': true  // Default "My Account" to open
	};
	// Track which groups have been manually toggled by the user
	let manuallyToggled: Record<string, boolean> = {};
	let apiBaseUrl = '';

	function toggleMenuGroup(label: string) {
		openMenuGroups[label] = !openMenuGroups[label];
		manuallyToggled[label] = true;
		openMenuGroups = { ...openMenuGroups };
	}

	onMount(async () => {
		const config = await webConfigStore.getConfig();
		apiBaseUrl = config.api.base_url;
	});

	function navigate(path: string, rel?: string) {
		if (currentPath === path) {
			return;
		}
		navigationHistoryStore.markNextNavigationAsMenu();
		goto(path, { state: { navigationSource: 'menu', navigationRel: rel } });
		sidebarStore.setMobileOpen(false);
	}

	async function handleLogout() {
		try {
			await authStore.signOut();
			toastStore.success('Logged out successfully');
			goto('/auth/signin');
		} catch (error) {
			toastStore.error('Failed to logout');
		}
	}

	$: collapsed = $sidebarStore.collapsed;
	$: currentPath = $page.url.pathname;
	$: navigation = $sitemapStore.navigation;
	$: isLoadingSitemap = $sitemapStore.isLoading;
	$: sitemapError = $sitemapStore.error;

	// Create reactive active states
	$: dashboardActive = currentPath === '/dashboard' || currentPath === '/';
	$: sessionsActive = currentPath === '/sessions';
	$: apiKeysActive = currentPath === '/api-keys';
	$: myProfileActive = currentPath === '/my-profile';

	// Split navigation: mainNav (all except My Account) and accountNav (My Account only)
	$: mainNav = navigation.filter((item: { label: string }) => item.label !== 'My Account');
	$: accountNav = navigation.find((item: { label: string }) => item.label === 'My Account');

	// Auto-expand menu groups containing the current active path
	$: {
		if (navigation && currentPath) {
			let shouldUpdate = false;
			for (const navItem of navigation) {
				if (navItem.links && navItem.links.length > 0) {
					const hasActiveChild = navItem.links.some((link: { link?: string }) =>
						link.link && currentPath === link.link
					);
					if (hasActiveChild && !openMenuGroups[navItem.label] && !manuallyToggled[navItem.label]) {
						openMenuGroups[navItem.label] = true;
						shouldUpdate = true;
					}
				}
			}
			if (shouldUpdate) {
				openMenuGroups = { ...openMenuGroups };
			}
		}
	}

	// Auto-expand My Account section when navigating to its child routes
	$: {
		if ((sessionsActive || apiKeysActive || myProfileActive) && !manuallyToggled['My Account']) {
			if (!openMenuGroups['My Account']) {
				openMenuGroups['My Account'] = true;
				openMenuGroups = { ...openMenuGroups };
			}
		}
	}
</script>

<aside
	class={cn(
		'flex flex-col h-full bg-background border-r transition-all duration-300 overflow-hidden',
		collapsed ? 'w-0' : 'w-60',
		className
	)}
>
	<!-- Branding Section -->
	<div class="flex items-center justify-between p-4 border-b min-w-60">
		<div class="flex items-center gap-3">
			<div class="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
				<span class="text-primary font-bold text-lg">SL</span>
			</div>
			<div class="flex flex-col">
				<span class="font-semibold text-sm">Serverless Launchpad</span>
				<span class="text-xs text-muted-foreground">Svelte Edition</span>
			</div>
		</div>
	</div>

	<!-- Navigation Section -->
	<nav class="flex-1 overflow-y-auto p-2 min-w-60">
		<ul class="space-y-1">
			<!-- Dashboard -->
			<li>
				<button
					on:click={() => navigate('/dashboard')}
					disabled={dashboardActive}
					class={cn(
						'w-full flex items-center justify-start gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium',
						dashboardActive
							? 'bg-accent text-accent-foreground cursor-default'
							: 'hover:bg-accent hover:text-accent-foreground'
					)}
				>
					<div class="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 text-primary">
						<Home class="h-4 w-4" />
					</div>
					<span>Home</span>
				</button>
			</li>

			<!-- Hypermedia API Documentation -->
			{#if apiBaseUrl}
				<li>
					<button
						on:click={() => window.open(apiBaseUrl, '_blank')}
						class="w-full flex items-center justify-start gap-3 px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors text-sm font-medium"
					>
						<div class="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 text-primary">
							<BookOpen class="h-4 w-4" />
						</div>
						<span class="text-left">Hypermedia API Docs</span>
					</button>
				</li>
			{/if}

			<!-- Dynamic Navigation from Sitemap (HATEOAS-driven) -->
			{#if isLoadingSitemap}
				<li class="mt-2"><div class="h-10 w-full rounded-md bg-muted animate-pulse"></div></li>
				<li class="mt-2"><div class="h-10 w-full rounded-md bg-muted animate-pulse"></div></li>
				<li class="mt-2"><div class="h-10 w-full rounded-md bg-muted animate-pulse"></div></li>
			{:else if sitemapError}
				<li class="mt-2 px-2">
					<div class="rounded-md border border-destructive/50 bg-destructive/10 p-3">
						<p class="text-xs text-destructive mb-2">Failed to load navigation</p>
						<button
							on:click={() => sitemapStore.refresh()}
							class="text-xs underline text-destructive hover:text-destructive/80"
						>
							Retry
						</button>
					</div>
				</li>
			{:else}
				<!-- Main Navigation (from API, excluding My Account) -->
				{#each mainNav as navItem (navItem.label)}
					{#if navItem.links && navItem.links.length > 0}
						<!-- Collapsible group (e.g., Admin) -->
						<li class="mt-2">
							<button
								on:click={() => toggleMenuGroup(navItem.label)}
								class="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors text-sm font-medium"
							>
								<span>{navItem.label}</span>
								<ChevronRight
									class={cn(
										'h-4 w-4 transition-transform duration-200',
										openMenuGroups[navItem.label] ? 'rotate-90' : 'rotate-0'
									)}
								/>
							</button>

							<!-- Child Links (animated container) -->
							<div
								class={cn(
									'grid transition-all duration-200 ease-in-out',
									openMenuGroups[navItem.label] ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
								)}
							>
								<ul class="ml-8 mt-1 space-y-1 overflow-hidden">
									{#each navItem.links as link (link.label)}
										{@const isLinkActive = currentPath === link.link}
										<li>
											<button
												on:click={() => navigate(link.link, link.rel)}
												disabled={isLinkActive}
												class={cn(
													'w-full flex items-center justify-start px-3 py-2 text-sm border-l-2 transition-colors',
													isLinkActive
														? 'border-primary bg-accent text-accent-foreground font-medium cursor-default'
														: 'border-border hover:bg-accent hover:text-accent-foreground'
												)}
											>
												<span>{link.label}</span>
											</button>
										</li>
									{/each}
								</ul>
							</div>
						</li>
					{:else}
						<!-- Single link item -->
						{@const isLinkActive = currentPath === (navItem.link || '')}
						<li>
							<button
								on:click={() => navigate(navItem.link || '')}
								disabled={isLinkActive}
								class={cn(
									'w-full flex items-center justify-start gap-3 px-3 py-2 rounded-md transition-colors text-sm',
									isLinkActive
										? 'bg-accent text-accent-foreground font-medium cursor-default'
										: 'hover:bg-accent hover:text-accent-foreground'
								)}
							>
								<span>{navItem.label}</span>
							</button>
						</li>
					{/if}
				{/each}
			{/if}

			<!-- My Account Section (HATEOAS-driven from API) -->
			<li class="mt-6 pt-6 border-t">
				<!-- My Account Header -->
				<button
					on:click={() => toggleMenuGroup('My Account')}
					class="w-full flex items-center justify-start gap-3 px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors text-sm font-medium"
				>
					<div class="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 text-primary">
						<User class="h-4 w-4" />
					</div>
					<span>My Account</span>
					<ChevronRight
						class={cn(
							'h-4 w-4 ml-auto transition-transform duration-200',
							openMenuGroups['My Account'] ? 'rotate-90' : 'rotate-0'
						)}
					/>
				</button>

				<!-- My Account Items (animated container) -->
				<div
					class={cn(
						'grid transition-all duration-200 ease-in-out',
						openMenuGroups['My Account'] ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
					)}
				>
					<ul class="ml-10 mt-1 space-y-1 overflow-hidden">
						{#if accountNav && accountNav.links}
							{#each accountNav.links as link (link.label)}
								{@const isLinkActive = currentPath === link.link}
								<li>
									<button
										on:click={() => navigate(link.link, link.rel)}
										disabled={isLinkActive}
										class={cn(
											'w-full flex items-center justify-start gap-3 px-3 py-2 text-sm border-l-2 transition-colors',
											isLinkActive
												? 'border-primary bg-accent text-accent-foreground font-medium cursor-default'
												: 'border-border hover:bg-accent hover:text-accent-foreground'
										)}
									>
										{#if link.label === 'Sessions'}
											<Clock class="h-4 w-4" />
										{:else if link.label === 'API Keys'}
											<Key class="h-4 w-4" />
										{:else if link.label === 'My Profile'}
											<User class="h-4 w-4" />
										{/if}
										<span>{link.label}</span>
									</button>
								</li>
							{/each}
						{:else}
							<!-- Fallback when API hasn't loaded My Account yet -->
							<li>
								<button
									on:click={() => navigate('/my-profile', 'my-profile')}
									disabled={myProfileActive}
									class={cn(
										'w-full flex items-center justify-start gap-3 px-3 py-2 text-sm border-l-2 transition-colors',
										myProfileActive
											? 'border-primary bg-accent text-accent-foreground font-medium cursor-default'
											: 'border-border hover:bg-accent hover:text-accent-foreground'
									)}
								>
									<User class="h-4 w-4" />
									<span>My Profile</span>
								</button>
							</li>
							<li>
								<button
									on:click={() => navigate('/sessions', 'sessions')}
									disabled={sessionsActive}
									class={cn(
										'w-full flex items-center justify-start gap-3 px-3 py-2 text-sm border-l-2 transition-colors',
										sessionsActive
											? 'border-primary bg-accent text-accent-foreground font-medium cursor-default'
											: 'border-border hover:bg-accent hover:text-accent-foreground'
									)}
								>
									<Clock class="h-4 w-4" />
									<span>Sessions</span>
								</button>
							</li>
							<li>
								<button
									on:click={() => navigate('/api-keys', 'api-keys')}
									disabled={apiKeysActive}
									class={cn(
										'w-full flex items-center justify-start gap-3 px-3 py-2 text-sm border-l-2 transition-colors',
										apiKeysActive
											? 'border-primary bg-accent text-accent-foreground font-medium cursor-default'
											: 'border-border hover:bg-accent hover:text-accent-foreground'
									)}
								>
									<Key class="h-4 w-4" />
									<span>API Keys</span>
								</button>
							</li>
						{/if}
						<!-- Logout (always present - client-side action) -->
						<li>
							<button
								on:click={handleLogout}
								class="w-full flex items-center justify-start gap-3 px-3 py-2 text-sm border-l-2 border-border hover:bg-destructive hover:text-destructive-foreground transition-colors"
							>
								<LogOut class="h-4 w-4" />
								<span>Logout</span>
							</button>
						</li>
					</ul>
				</div>
			</li>
		</ul>
	</nav>
</aside>
