<script lang="ts">
	import { goto } from '$app/navigation';
	import { signUp, SignInStep } from '$lib/auth';
	import { logger } from '$lib/logging/logger';
	
	let email = '';
	let password = '';
	let firstName = '';
	let lastName = '';
	let loading = false;
	let errorMessage = '';

	async function handleSubmit(event: Event) {
		event.preventDefault();
		loading = true;
		errorMessage = '';

		try {
			const result = await signUp({ email, password, firstName, lastName });
			
			if (result === SignInStep.CONFIRM_SIGNUP) {
				goto(`/auth/confirm-signup?email=${encodeURIComponent(email)}`);
			} else if (result === SignInStep.SIGNIN) {
				goto('/auth/signin');
			}
		} catch (error) {
			logger.error('Sign up failed', { error });
			errorMessage = error instanceof Error ? error.message : 'Sign up failed';
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
			<h2 class="h2">Sign Up</h2>
		</header>
		
		<form on:submit={handleSubmit} class="space-y-4">
			{#if errorMessage}
				<aside class="alert variant-filled-error">
					<p>{errorMessage}</p>
				</aside>
			{/if}
			
			<div class="grid grid-cols-2 gap-4">
				<label class="label">
					<span>First Name *</span>
					<input 
						class="input" 
						type="text" 
						bind:value={firstName}
						required
						disabled={loading}
					/>
				</label>

				<label class="label">
					<span>Last Name *</span>
					<input 
						class="input" 
						type="text" 
						bind:value={lastName}
						required
						disabled={loading}
					/>
				</label>
			</div>

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

			<label class="label">
				<span>Password *</span>
				<input 
					class="input" 
					type="password" 
					bind:value={password}
					required
					disabled={loading}
				/>
				<div class="text-xs text-surface-600-300-token mt-1">
					Must be at least 8 characters with uppercase, lowercase, number, and special character
				</div>
			</label>

			<button type="submit" class="btn variant-filled-primary w-full" disabled={loading}>
				{loading ? 'Creating account...' : 'Sign Up'}
			</button>

			<div class="text-center text-sm">
				Already have an account? <a href="/auth/signin" class="anchor">Sign In</a>
			</div>
		</form>
	</div>
</div>
