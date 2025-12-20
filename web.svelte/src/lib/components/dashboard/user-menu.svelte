<script lang="ts">
	import { authStore } from '$lib/stores/auth_store';
	import { signOut } from '$lib/auth';
	import { goto } from '$app/navigation';
	import { User, LogOut, BookOpen, Settings } from 'lucide-svelte';
	import { toastStore } from '$lib/stores/toast_store';
	import { Root as DropdownRoot, Trigger as DropdownTrigger } from '$lib/components/ui/dropdown-menu.svelte';
	import DropdownMenuContent from '$lib/components/ui/dropdown-menu-content.svelte';
	import DropdownMenuItem from '$lib/components/ui/dropdown-menu-item.svelte';
	import DropdownMenuLabel from '$lib/components/ui/dropdown-menu-label.svelte';
	import DropdownMenuSeparator from '$lib/components/ui/dropdown-menu-separator.svelte';
	import Avatar from '$lib/components/ui/avatar.svelte';
	import AvatarFallback from '$lib/components/ui/avatar-fallback.svelte';
	import Button from '$lib/components/ui/button.svelte';

	async function handleSignOut() {
		try {
			await signOut();
			toastStore.success('Signed out successfully');
			await goto('/auth/signin', { replaceState: true, invalidateAll: true });
		} catch (error) {
			toastStore.error('Failed to sign out');
			console.error('Sign out error:', error);
		}
	}

	$: user = $authStore.user;
	$: email = user?.email || '';
	$: username = user?.username || '';

	// Get initials from username or email
	function getInitials(name: string): string {
		if (!name) return 'U';
		const parts = name.split(/[\s@.]+/);
		if (parts.length >= 2) {
			return (parts[0][0] + parts[1][0]).toUpperCase();
		}
		return name.slice(0, 2).toUpperCase();
	}

	$: initials = getInitials(username || email);
</script>

{#if user}
	<DropdownRoot>
		<DropdownTrigger asChild let:builder>
			<Button variant="ghost" class="relative h-10 w-10 rounded-full" builders={[builder]}>
				<Avatar class="h-9 w-9">
					<AvatarFallback class="bg-primary/10 text-primary font-medium">
						{initials}
					</AvatarFallback>
				</Avatar>
			</Button>
		</DropdownTrigger>
		<DropdownMenuContent class="w-56" align="end">
			<DropdownMenuLabel>
				<div class="flex flex-col space-y-1">
					<p class="text-sm font-medium leading-none">{username}</p>
					<p class="text-xs leading-none text-muted-foreground">{email}</p>
				</div>
			</DropdownMenuLabel>
			<DropdownMenuSeparator />
			<DropdownMenuItem on:click={() => goto('/account')}>
				<User class="mr-2 h-4 w-4" />
				<span>My Account</span>
			</DropdownMenuItem>
			<DropdownMenuItem on:click={() => goto('/docs')}>
				<BookOpen class="mr-2 h-4 w-4" />
				<span>API Documentation</span>
			</DropdownMenuItem>
			<DropdownMenuSeparator />
			<DropdownMenuItem on:click={handleSignOut}>
				<LogOut class="mr-2 h-4 w-4" />
				<span>Sign Out</span>
			</DropdownMenuItem>
		</DropdownMenuContent>
	</DropdownRoot>
{/if}
