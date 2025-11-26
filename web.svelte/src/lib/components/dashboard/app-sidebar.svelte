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
	import { Root as TooltipRoot, Trigger as TooltipTrigger } from '$lib/components/ui/tooltip.svelte';
	import TooltipContent from '$lib/components/ui/tooltip-content.svelte';
	import { toastStore } from '$lib/stores/toast_store';
	import { cn } from '$lib/utils';

	let className: string | undefined = undefined;
	export { className as class };

	// Track open state for each collapsible menu group by label
	let openMenuGroups: Record<string, boolean> = {
		'My Account': true  // Default "My Account" to open
	};
	// Track which groups have been manually toggled by the user
	// This prevents auto-expand from overriding user's explicit toggle
	let manuallyToggled: Record<string, boolean> = {};
	let apiBaseUrl = '';

	function toggleMenuGroup(label: string) {
		openMenuGroups[label] = !openMenuGroups[label];
		manuallyToggled[label] = true;  // Mark as manually toggled
		// Force Svelte to detect the change
		openMenuGroups = { ...openMenuGroups };
	}

	onMount(async () => {
		const config = await webConfigStore.getConfig();
		apiBaseUrl = config.api.base_url;
	});

	function navigate(path: string) {
		// Don't navigate if already on this path
		if (currentPath === path) {
			return;
		}
		// Mark next navigation as menu
		navigationHistoryStore.markNextNavigationAsMenu();

		// Navigate with state
		goto(path, { state: { navigationSource: 'menu' } });
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
	// Only auto-expand if user hasn't manually toggled the group
	$: {
		if (navigation && currentPath) {
			let shouldUpdate = false;
			for (const navItem of navigation) {
				if (navItem.links && navItem.links.length > 0) {
					const hasActiveChild = navItem.links.some((link: { link?: string }) =>
						link.link && currentPath === link.link
					);
					// Only auto-expand if not manually toggled and currently closed
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
	// Only auto-expand if user hasn't manually toggled it
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
		'flex flex-col h-full bg-background border-r transition-all duration-300',
		collapsed ? 'w-16' : 'w-60',
		className
	)}
>
	<!-- Branding Section -->
	<div class="flex items-center justify-between p-4 border-b">
		{#if !collapsed}
			<div class="flex items-center gap-3">
				<div class="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
					<span class="text-primary font-bold text-lg">SL</span>
				</div>
				<div class="flex flex-col">
					<span class="font-semibold text-sm">Serverless Launchpad</span>
					<span class="text-xs text-muted-foreground">Svelte Edition</span>
				</div>
			</div>
		{:else}
			<div class="flex items-center justify-center w-full">
				<div class="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
					<span class="text-primary font-bold text-lg">SL</span>
				</div>
			</div>
		{/if}
	</div>

	<!-- Navigation Section -->
	<nav class="flex-1 overflow-y-auto p-2">
		<ul class="space-y-1">
			<!-- Dashboard -->
			<li>
				{#if collapsed}
					<TooltipRoot>
						<TooltipTrigger asChild let:builder>
							<button
								use:builder.action
								{...builder}
								on:click={() => navigate('/dashboard')}
								disabled={dashboardActive}
								class={cn(
									'w-full flex items-center justify-center h-10 rounded-md transition-colors',
									dashboardActive
										? 'bg-accent text-accent-foreground cursor-default'
										: 'hover:bg-accent hover:text-accent-foreground'
								)}
							>
								<div class="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 text-primary">
									<Home class="h-4 w-4" />
								</div>
							</button>
						</TooltipTrigger>
						<TooltipContent side="right">Home</TooltipContent>
					</TooltipRoot>
				{:else}
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
				{/if}
			</li>

			<!-- Hypermedia API Documentation -->
			{#if apiBaseUrl}
				<li>
					{#if collapsed}
						<TooltipRoot>
							<TooltipTrigger asChild let:builder>
								<button
									use:builder.action
									{...builder}
									on:click={() => window.open(apiBaseUrl, '_blank')}
									class="w-full flex items-center justify-center h-10 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
								>
									<div class="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 text-primary">
										<BookOpen class="h-4 w-4" />
									</div>
								</button>
							</TooltipTrigger>
							<TooltipContent side="right">Hypermedia API Docs</TooltipContent>
						</TooltipRoot>
					{:else}
						<button
							on:click={() => window.open(apiBaseUrl, '_blank')}
							class="w-full flex items-center justify-start gap-3 px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors text-sm font-medium"
						>
							<div class="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 text-primary">
								<BookOpen class="h-4 w-4" />
							</div>
							<span class="text-left">Hypermedia API Docs</span>
						</button>
					{/if}
				</li>
			{/if}

			<!-- Dynamic Navigation from Sitemap (HATEOAS-driven) -->
			{#if isLoadingSitemap}
				<!-- Loading state -->
				{#if !collapsed}
					<li class="mt-2"><div class="h-10 w-full rounded-md bg-muted animate-pulse"></div></li>
					<li class="mt-2"><div class="h-10 w-full rounded-md bg-muted animate-pulse"></div></li>
					<li class="mt-2"><div class="h-10 w-full rounded-md bg-muted animate-pulse"></div></li>
				{/if}
			{:else if sitemapError}
				<!-- Error state -->
				{#if !collapsed}
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
				{/if}
			{:else}
				<!-- Main Navigation (from API, excluding My Account) -->
				{#each mainNav as navItem (navItem.label)}
					{#if navItem.links && navItem.links.length > 0}
						<!-- Collapsible group (e.g., Admin) -->
						{#if !collapsed}
							<li class="mt-2">
								<!-- Group Header Button -->
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
													on:click={() => navigate(link.link)}
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
							<!-- Collapsed state for groups - show first letter indicator -->
							<li class="mt-2">
								<TooltipRoot>
									<TooltipTrigger asChild let:builder>
										<button
											use:builder.action
											{...builder}
											on:click={() => toggleMenuGroup(navItem.label)}
											class="w-full flex items-center justify-center h-10 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
										>
											<span class="text-lg font-medium">{navItem.label.charAt(0)}</span>
										</button>
									</TooltipTrigger>
									<TooltipContent side="right">{navItem.label}</TooltipContent>
								</TooltipRoot>
							</li>
						{/if}
					{:else}
						<!-- Single link item -->
						{@const isLinkActive = currentPath === (navItem.link || '')}
						<li>
							{#if collapsed}
								<TooltipRoot>
									<TooltipTrigger asChild let:builder>
										<button
											use:builder.action
											{...builder}
											on:click={() => navigate(navItem.link || '')}
											disabled={isLinkActive}
											class={cn(
												'w-full flex items-center justify-center h-10 rounded-md transition-colors',
												isLinkActive
													? 'bg-accent text-accent-foreground cursor-default'
													: 'hover:bg-accent hover:text-accent-foreground'
											)}
										>
											<span class="text-lg">{navItem.label.charAt(0)}</span>
										</button>
									</TooltipTrigger>
									<TooltipContent side="right">{navItem.label}</TooltipContent>
								</TooltipRoot>
							{:else}
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
							{/if}
						</li>
					{/if}
				{/each}
			{/if}

			<!-- My Account Section (HATEOAS-driven from API) -->
			{#if !collapsed}
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
								<!-- Render links from API -->
								{#each accountNav.links as link (link.label)}
									{@const isLinkActive = currentPath === link.link}
									<li>
										<button
											on:click={() => navigate(link.link)}
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
										on:click={() => navigate('/my-profile')}
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
										on:click={() => navigate('/sessions')}
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
										on:click={() => navigate('/api-keys')}
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
			{:else}
				<!-- Collapsed My Account Items -->
				{#if accountNav && accountNav.links}
					{#each accountNav.links as link, i (link.label)}
						{@const isLinkActive = currentPath === link.link}
						<li class={i === 0 ? 'mt-6 pt-6 border-t' : ''}>
							<TooltipRoot>
								<TooltipTrigger asChild let:builder>
									<button
										use:builder.action
										{...builder}
										on:click={() => navigate(link.link)}
										disabled={isLinkActive}
										class={cn(
											'w-full flex items-center justify-center h-10 rounded-md transition-colors',
											isLinkActive
												? 'bg-accent text-accent-foreground cursor-default'
												: 'hover:bg-accent hover:text-accent-foreground'
										)}
									>
										{#if link.label === 'Sessions'}
											<Clock class="h-5 w-5" />
										{:else if link.label === 'API Keys'}
											<Key class="h-5 w-5" />
										{:else if link.label === 'My Profile'}
											<User class="h-5 w-5" />
										{:else}
											<span class="text-lg">{link.label.charAt(0)}</span>
										{/if}
									</button>
								</TooltipTrigger>
								<TooltipContent side="right">{link.label}</TooltipContent>
							</TooltipRoot>
						</li>
					{/each}
				{:else}
					<!-- Fallback collapsed items -->
					<li class="mt-6 pt-6 border-t">
						<TooltipRoot>
							<TooltipTrigger asChild let:builder>
								<button
									use:builder.action
									{...builder}
									on:click={() => navigate('/my-profile')}
									disabled={myProfileActive}
									class={cn(
										'w-full flex items-center justify-center h-10 rounded-md transition-colors',
										myProfileActive
											? 'bg-accent text-accent-foreground cursor-default'
											: 'hover:bg-accent hover:text-accent-foreground'
									)}
								>
									<User class="h-5 w-5" />
								</button>
							</TooltipTrigger>
							<TooltipContent side="right">My Profile</TooltipContent>
						</TooltipRoot>
					</li>
					<li>
						<TooltipRoot>
							<TooltipTrigger asChild let:builder>
								<button
									use:builder.action
									{...builder}
									on:click={() => navigate('/sessions')}
									disabled={sessionsActive}
									class={cn(
										'w-full flex items-center justify-center h-10 rounded-md transition-colors',
										sessionsActive
											? 'bg-accent text-accent-foreground cursor-default'
											: 'hover:bg-accent hover:text-accent-foreground'
									)}
								>
									<Clock class="h-5 w-5" />
								</button>
							</TooltipTrigger>
							<TooltipContent side="right">Sessions</TooltipContent>
						</TooltipRoot>
					</li>
					<li>
						<TooltipRoot>
							<TooltipTrigger asChild let:builder>
								<button
									use:builder.action
									{...builder}
									on:click={() => navigate('/api-keys')}
									disabled={apiKeysActive}
									class={cn(
										'w-full flex items-center justify-center h-10 rounded-md transition-colors',
										apiKeysActive
											? 'bg-accent text-accent-foreground cursor-default'
											: 'hover:bg-accent hover:text-accent-foreground'
									)}
								>
									<Key class="h-5 w-5" />
								</button>
							</TooltipTrigger>
							<TooltipContent side="right">API Keys</TooltipContent>
						</TooltipRoot>
					</li>
				{/if}
				<li>
					<TooltipRoot>
						<TooltipTrigger asChild let:builder>
							<button
								use:builder.action
								{...builder}
								on:click={handleLogout}
								class="w-full flex items-center justify-center h-10 rounded-md hover:bg-destructive hover:text-destructive-foreground transition-colors"
							>
								<LogOut class="h-5 w-5" />
							</button>
						</TooltipTrigger>
						<TooltipContent side="right">Logout</TooltipContent>
					</TooltipRoot>
				</li>
			{/if}
		</ul>
	</nav>

</aside>
