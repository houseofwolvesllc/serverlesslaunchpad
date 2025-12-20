<script lang="ts">
	import { authStore } from '$lib/stores/auth_store';
	import { sitemapStore } from '$lib/stores/sitemap_store';
	import { signOut } from '$lib/auth';
	import { Key, Clock, LogOut, ArrowRight } from 'lucide-svelte';
	import Card from '$lib/components/ui/card.svelte';
	import CardHeader from '$lib/components/ui/card-header.svelte';
	import CardContent from '$lib/components/ui/card-content.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { toastStore } from '$lib/stores/toast_store';

	$: user = $authStore.user;
	$: username = user?.username || user?.email || 'User';
	$: firstName = user?.firstName;

	// Get HATEOAS links/templates from sitemap - must be reactive
	$: links = $sitemapStore.links;
	$: templates = $sitemapStore.templates;

	// Resolve hrefs reactively from links or templates (HATEOAS pattern)
	$: sessionsHref = links?.['sessions']?.href || templates?.['sessions']?.target || null;
	$: apiKeysHref = links?.['api-keys']?.href || templates?.['api-keys']?.target || null;

	// Greeting based on time of day
	function getGreeting(): string {
		const hour = new Date().getHours();
		if (hour < 12) return 'Good morning';
		if (hour < 18) return 'Good afternoon';
		return 'Good evening';
	}

	async function handleLogout() {
		try {
			await signOut();
			toastStore.success('Logged out successfully');
			await goto('/auth/signin', { replaceState: true, invalidateAll: true });
		} catch (error) {
			toastStore.error('Failed to logout');
		}
	}
</script>

<div class="space-y-8">
	<!-- Welcome Header -->
	<div class="space-y-2">
		<h1 class="text-4xl font-bold tracking-tight">
			{getGreeting()}{firstName ? `, ${firstName}` : ''}!
		</h1>
		<p class="text-lg text-muted-foreground">
			Welcome to your dashboard. Here's an overview of your account.
		</p>
	</div>

	<!-- Quick Actions -->
	<div>
		<h2 class="text-2xl font-semibold tracking-tight mb-4">Quick Actions</h2>
		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			<Card class="hover:shadow-md transition-shadow">
				<CardHeader>
					<div class="flex items-center gap-3">
						<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
							<Clock class="h-5 w-5 text-primary" />
						</div>
						<h3 class="font-semibold">Manage Sessions</h3>
					</div>
				</CardHeader>
				<CardContent class="space-y-3">
					<p class="text-sm text-muted-foreground">
						View and manage your active login sessions across devices.
					</p>
					<Button class="w-full" disabled={!sessionsHref} on:click={() => sessionsHref && goto(sessionsHref)}>
						Manage Sessions
						<ArrowRight class="ml-2 h-4 w-4" />
					</Button>
				</CardContent>
			</Card>

			<Card class="hover:shadow-md transition-shadow">
				<CardHeader>
					<div class="flex items-center gap-3">
						<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
							<Key class="h-5 w-5 text-primary" />
						</div>
						<h3 class="font-semibold">Manage API Keys</h3>
					</div>
				</CardHeader>
				<CardContent class="space-y-3">
					<p class="text-sm text-muted-foreground">
						Generate and manage API keys for programmatic access.
					</p>
					<Button class="w-full" disabled={!apiKeysHref} on:click={() => apiKeysHref && goto(apiKeysHref)}>
						Manage API Keys
						<ArrowRight class="ml-2 h-4 w-4" />
					</Button>
				</CardContent>
			</Card>

			<Card class="hover:shadow-md transition-shadow">
				<CardHeader>
					<div class="flex items-center gap-3">
						<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
							<LogOut class="h-5 w-5 text-destructive" />
						</div>
						<h3 class="font-semibold">Logout</h3>
					</div>
				</CardHeader>
				<CardContent class="space-y-3">
					<p class="text-sm text-muted-foreground">
						Sign out of your account and end your current session.
					</p>
					<Button variant="destructive" class="w-full" on:click={handleLogout}>
						Logout
						<ArrowRight class="ml-2 h-4 w-4" />
					</Button>
				</CardContent>
			</Card>
		</div>
	</div>

	<!-- Account Information -->
	<Card>
		<CardHeader>
			<h2 class="text-2xl font-semibold tracking-tight">Account Information</h2>
		</CardHeader>
		<CardContent>
			<dl class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
				<div class="space-y-1">
					<dt class="text-sm font-medium text-muted-foreground">Username</dt>
					<dd class="text-base font-semibold">{username}</dd>
				</div>
				<div class="space-y-1">
					<dt class="text-sm font-medium text-muted-foreground">Email Address</dt>
					<dd class="text-base font-semibold">{user?.email}</dd>
				</div>
				<div class="space-y-1">
					<dt class="text-sm font-medium text-muted-foreground">Account Type</dt>
					<dd class="text-base font-semibold">Standard</dd>
				</div>
			</dl>
		</CardContent>
	</Card>
</div>
