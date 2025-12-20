<script lang="ts">
	import { authStore } from '$lib/stores/auth_store';
	import { signOut } from '$lib/auth';
	import { goto } from '$app/navigation';
	import { User, LogOut } from 'lucide-svelte';
	import { toastStore } from '$lib/stores/toast_store';

	async function handleSignOut() {
		try {
			await signOut();
			toastStore.success('Signed out successfully');
			goto('/auth/signin');
		} catch (error) {
			toastStore.error('Failed to sign out');
			console.error('Sign out error:', error);
		}
	}

	$: user = $authStore.user;
	$: email = user?.email || '';
	$: username = user?.username || '';
</script>

{#if user}
	<div class="dropdown dropdown-end">
		<button tabindex="0" class="btn btn-sm variant-ghost-surface gap-2">
			<User size={18} />
			<span class="hidden md:inline">{username || email}</span>
		</button>
		<ul
			tabindex="0"
			class="dropdown-content menu bg-base-100 rounded-box z-[1] w-52 p-2 shadow-lg border border-surface-300-600-token"
		>
			<li class="menu-title">
				<span class="text-xs opacity-70">Account</span>
			</li>
			<li class="disabled">
				<div class="flex flex-col items-start gap-1">
					<span class="font-semibold text-sm">{username}</span>
					<span class="text-xs opacity-70">{email}</span>
				</div>
			</li>
			<li class="menu-title">
				<span class="text-xs opacity-70">Actions</span>
			</li>
			<li>
				<button on:click={handleSignOut} class="gap-2">
					<LogOut size={16} />
					<span>Sign Out</span>
				</button>
			</li>
		</ul>
	</div>
{/if}
