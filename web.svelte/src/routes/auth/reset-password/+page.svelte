<script lang="ts">
	import { goto } from '$app/navigation';
	import { resetPassword } from '$lib/auth';
	import { logger } from '$lib/logging/logger';
	
	let email = '';
	let loading = false;
	let errorMessage = '';
	let successMessage = '';

	async function handleSubmit(event: Event) {
		event.preventDefault();
		loading = true;
		errorMessage = '';

		try {
			await resetPassword({ email });
			successMessage = 'Reset code sent! Redirecting...';
			setTimeout(() => {
				goto(`/auth/confirm-reset-password?email=${encodeURIComponent(email)}`);
			}, 2000);
		} catch (error) {
			logger.error('Reset password failed', { error });
			errorMessage = error instanceof Error ? error.message : 'Failed to send reset code';
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
			<h2 class="h2">Reset Your Password</h2>
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
				<span>Email *</span>
				<input 
					class="input" 
					type="email" 
					bind:value={email}
					required
					disabled={loading}
					placeholder="your@email.com"
				/>
			</label>

			<button type="submit" class="btn variant-filled-primary w-full" disabled={loading}>
				{loading ? 'Sending code...' : 'Reset Password'}
			</button>

			<div class="text-center text-sm">
				Remember your password? <a href="/auth/signin" class="anchor">Sign In</a>
			</div>
		</form>
	</div>
</div>
