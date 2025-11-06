<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { confirmResetPassword } from '$lib/auth';
	import { logger } from '$lib/logging/logger';
	import { onMount } from 'svelte';
	
	let email = '';
	let confirmationCode = '';
	let newPassword = '';
	let loading = false;
	let errorMessage = '';
	let successMessage = '';

	onMount(() => {
		email = $page.url.searchParams.get('email') || '';
	});

	async function handleSubmit(event: Event) {
		event.preventDefault();
		loading = true;
		errorMessage = '';

		try {
			await confirmResetPassword({ email, confirmationCode, newPassword });
			successMessage = 'Password reset successful! Redirecting...';
			setTimeout(() => goto('/auth/signin'), 2000);
		} catch (error) {
			logger.error('Confirm reset password failed', { error });
			errorMessage = error instanceof Error ? error.message : 'Password reset failed';
		} finally {
			loading = false;
		}
	}
</script>

<div class="container h-full mx-auto flex justify-center items-center">
	<div class="card p-8 w-full max-w-md variant-filled-surface">
		<div class="flex justify-center mb-8">
			<img src="/svg/serverless_launchpad_logo.svg" alt="Serverless Launchpad" class="h-24" />
		</div>
		
		<header class="card-header mb-4">
			<h2 class="h2">Confirm Password Reset</h2>
		</header>
		
		<form on:submit={handleSubmit} class="space-y-4">
			{#if errorMessage}
				<aside class="alert variant-filled-error">
					<p>{errorMessage}</p>
				</aside>
			{/if}

			{#if successMessage}
				<aside class="alert variant-filled-success">
					<p>{successMessage}</p>
				</aside>
			{/if}
			
			<label class="label">
				<span>Confirmation Code *</span>
				<input 
					class="input" 
					type="text" 
					bind:value={confirmationCode}
					required
					disabled={loading}
					placeholder="Enter code from email"
				/>
			</label>

			<label class="label">
				<span>New Password *</span>
				<input 
					class="input" 
					type="password" 
					bind:value={newPassword}
					required
					disabled={loading}
				/>
				<div class="text-xs text-surface-600-300-token mt-1">
					Must be at least 8 characters with uppercase, lowercase, number, and special character
				</div>
			</label>

			<button type="submit" class="btn variant-filled-primary w-full" disabled={loading}>
				{loading ? 'Resetting...' : 'Reset Password'}
			</button>
		</form>
	</div>
</div>
