<script lang="ts">
	import { sidebarStore } from '$lib/stores/sidebar_store';
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
		ChevronLeft,
		ChevronRight,
		ChevronDown
	} from 'lucide-svelte';
	import { Root as TooltipRoot, Trigger as TooltipTrigger } from '$lib/components/ui/tooltip.svelte';
	import TooltipContent from '$lib/components/ui/tooltip-content.svelte';
	import { toastStore } from '$lib/stores/toast_store';
	import { cn } from '$lib/utils';

	let className: string | undefined = undefined;
	export { className as class };

	let accountMenuOpen = true;
	let apiBaseUrl = '';

	onMount(async () => {
		const config = await webConfigStore.getConfig();
		apiBaseUrl = config.api.base_url;
	});

	function navigate(path: string) {
		goto(path);
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

	// Create reactive active states
	$: dashboardActive = currentPath === '/dashboard';
	$: sessionsActive = currentPath === '/sessions';
	$: apiKeysActive = currentPath === '/api-keys';

	function isActive(path: string): boolean {
		return currentPath === path;
	}

	// Keep My Account section open when on any of its routes
	$: {
		if (sessionsActive || apiKeysActive) {
			accountMenuOpen = true;
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
								class={cn(
									'w-full flex items-center justify-center h-10 rounded-md transition-colors',
									dashboardActive
										? 'bg-primary text-primary-foreground'
										: 'hover:bg-accent hover:text-accent-foreground'
								)}
							>
								<Home class="h-5 w-5" />
							</button>
						</TooltipTrigger>
						<TooltipContent side="right">Dashboard</TooltipContent>
					</TooltipRoot>
				{:else}
					<button
						on:click={() => navigate('/dashboard')}
						class={cn(
							'w-full flex items-center justify-start gap-3 px-3 py-2 rounded-md transition-colors text-sm',
							dashboardActive
								? 'bg-primary text-primary-foreground'
								: 'hover:bg-accent hover:text-accent-foreground'
						)}
					>
						<Home class="h-5 w-5" />
						<span>Dashboard</span>
					</button>
				{/if}
			</li>

			<!-- Hypermedia API Documentation -->
			<li>
				{#if collapsed}
					<TooltipRoot>
						<TooltipTrigger asChild let:builder>
							<button
								use:builder.action
								{...builder}
								on:click={() => apiBaseUrl && window.open(apiBaseUrl, '_blank')}
								class="w-full flex items-center justify-center h-10 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
							>
								<BookOpen class="h-5 w-5" />
							</button>
						</TooltipTrigger>
						<TooltipContent side="right">Hypermedia API Documentation</TooltipContent>
					</TooltipRoot>
				{:else}
					<button
						on:click={() => apiBaseUrl && window.open(apiBaseUrl, '_blank')}
						class="w-full flex items-center justify-start gap-3 px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors text-sm"
					>
						<BookOpen class="h-5 w-5 flex-shrink-0" />
						<span class="text-left">Hypermedia API Documentation</span>
					</button>
				{/if}
			</li>

			<!-- My Account (collapsible group) -->
			{#if !collapsed}
				<li class="mt-6 pt-6 border-t">
					<!-- My Account Header -->
					<button
						on:click={() => (accountMenuOpen = !accountMenuOpen)}
						class="w-full flex items-center justify-start gap-3 px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors text-sm"
					>
						<User class="h-5 w-5" />
						<span>My Account</span>
						<ChevronDown
							class={cn(
								'h-4 w-4 ml-auto transition-transform',
								accountMenuOpen ? 'transform rotate-180' : ''
							)}
						/>
					</button>

					<!-- My Account Items -->
					{#if accountMenuOpen}
						<ul class="ml-8 mt-1 space-y-1">
							<li>
								<button
									on:click={() => navigate('/sessions')}
									class={cn(
										'w-full flex items-center justify-start gap-3 px-3 py-2 rounded-md transition-colors text-sm',
										sessionsActive
											? 'bg-primary text-primary-foreground'
											: 'hover:bg-accent hover:text-accent-foreground'
									)}
								>
									<Clock class="h-4 w-4" />
									<span>Sessions</span>
								</button>
							</li>
							<li>
								<button
									on:click={() => navigate('/api-keys')}
									class={cn(
										'w-full flex items-center justify-start gap-3 px-3 py-2 rounded-md transition-colors text-sm',
										apiKeysActive
											? 'bg-primary text-primary-foreground'
											: 'hover:bg-accent hover:text-accent-foreground'
									)}
								>
									<Key class="h-4 w-4" />
									<span>API Keys</span>
								</button>
							</li>
							<li>
								<button
									on:click={handleLogout}
									class="w-full flex items-center justify-start gap-3 px-3 py-2 rounded-md hover:bg-destructive hover:text-destructive-foreground transition-colors text-sm"
								>
									<LogOut class="h-4 w-4" />
									<span>Logout</span>
								</button>
							</li>
						</ul>
					{/if}
				</li>
			{:else}
				<!-- Collapsed My Account Items -->
				<li class="mt-6 pt-6 border-t">
					<TooltipRoot>
						<TooltipTrigger asChild let:builder>
							<button
								use:builder.action
								{...builder}
								on:click={() => navigate('/sessions')}
								class={cn(
									'w-full flex items-center justify-center h-10 rounded-md transition-colors',
									sessionsActive
										? 'bg-primary text-primary-foreground'
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
								class={cn(
									'w-full flex items-center justify-center h-10 rounded-md transition-colors',
									apiKeysActive
										? 'bg-primary text-primary-foreground'
										: 'hover:bg-accent hover:text-accent-foreground'
								)}
							>
								<Key class="h-5 w-5" />
							</button>
						</TooltipTrigger>
						<TooltipContent side="right">API Keys</TooltipContent>
					</TooltipRoot>
				</li>
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

	<!-- Collapse Toggle Button -->
	<div class="p-2 border-t">
		<button
			on:click={() => sidebarStore.toggle()}
			class="w-full flex items-center justify-center h-10 rounded-md hover:bg-accent transition-colors"
			aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
		>
			{#if collapsed}
				<ChevronRight class="h-5 w-5" />
			{:else}
				<div class="flex items-center gap-2">
					<ChevronLeft class="h-5 w-5" />
					<span class="text-sm">Collapse</span>
				</div>
			{/if}
		</button>
	</div>
</aside>
