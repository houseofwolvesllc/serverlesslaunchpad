<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { confirmSignUp, resendConfirmationCode, SignInStep } from '$lib/auth';
	import { logger } from '$lib/logging/logger';
	import { onMount } from 'svelte';
	
	let email = '';
	let confirmationCode = '';
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
			const result = await confirmSignUp({ email, confirmationCode });
			
			if (result === SignInStep.SIGNIN) {
				successMessage = 'Account confirmed! Redirecting to sign in...';
				setTimeout(() => goto('/auth/signin'), 2000);
			}
		} catch (error) {
			logger.error('Confirm sign up failed', { error });
			errorMessage = error instanceof Error ? error.message : 'Confirmation failed';
		} finally {
			loading = false;
		}
	}

	async function handleResend() {
		loading = true;
		errorMessage = '';
		successMessage = '';

		try {
			await resendConfirmationCode(email);
			successMessage = 'Confirmation code resent! Please check your email.';
		} catch (error) {
			logger.error('Resend code failed', { error });
			errorMessage = error instanceof Error ? error.message : 'Failed to resend code';
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
			<h2 class="h2">Confirm Your Sign Up</h2>
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

			<div class="flex justify-between items-center">
				<button 
					type="button"
					class="btn btn-sm variant-ghost"
					on:click={handleResend}
					disabled={loading}
				>
					Resend Code
				</button>
				
				<button type="submit" class="btn variant-filled-primary" disabled={loading}>
					{loading ? 'Confirming...' : 'Confirm'}
				</button>
			</div>
		</form>
	</div>
</div>
