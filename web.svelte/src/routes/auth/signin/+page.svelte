<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { signIn, SignInStep, verifySession, AuthError } from '$lib/auth';
	import { authStore } from '$lib/stores/auth_store';
	import { logger } from '$lib/logging/logger';
	import { getEntryPoint, refreshCapabilities } from '$lib/services/entry_point_provider';
	import { getInitializationPromise } from '$lib/init';
	import Input from '$lib/components/ui/input.svelte';
	import Label from '$lib/components/ui/label.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import Card from '$lib/components/ui/card.svelte';
	import CardHeader from '$lib/components/ui/card-header.svelte';
	import CardContent from '$lib/components/ui/card-content.svelte';
	import { AlertCircle, Eye, EyeOff } from 'lucide-svelte';

	let email = '';
	let password = '';
	let loading = false;
	let errorMessage = '';
	let passwordError = '';
	let emailError = '';
	let checkingAuth = true;
	let showPassword = false;

	// Check for existing session on mount
	onMount(async () => {
		try {
			// Wait for initialization
			await getInitializationPromise();

			// Refresh capabilities to discover templates
			await refreshCapabilities();

			// Check if verify template exists (indicates valid session)
			const entryPoint = await getEntryPoint();
			const verifyTemplate = await entryPoint.getTemplate('verify');

			if (verifyTemplate) {
				// Valid session exists - verify and redirect
				logger.debug('Valid session found, verifying and redirecting');
				try {
					const user = await verifySession();
					authStore.setUser(user);
					authStore.setInitialized(true);
					goto('/dashboard');
					return;
				} catch (error) {
					logger.error('Session verification failed', { error });
				}
			}

			// No valid session or verification failed
			authStore.setInitialized(true);
		} catch (error) {
			logger.error('Error checking authentication', { error });
			authStore.setInitialized(true);
		} finally {
			checkingAuth = false;
		}
	});

	async function handleSubmit(event: Event) {
		event.preventDefault();
		loading = true;
		errorMessage = '';
		passwordError = '';
		emailError = '';

		try {
			const result = await signIn({ email, password });

			if (result === SignInStep.COMPLETED) {
				goto('/');
			} else if (result === SignInStep.CONFIRM_SIGNUP) {
				goto(`/auth/confirm-signup?email=${encodeURIComponent(email)}`);
			} else if (result === SignInStep.RESET_PASSWORD) {
				goto(`/auth/reset-password?email=${encodeURIComponent(email)}`);
			}
		} catch (error) {
			logger.error('Sign in failed', { error });

			if (error instanceof AuthError) {
				switch (error.name) {
					case 'UserNotConfirmedException':
						goto(`/auth/confirm-signup?email=${encodeURIComponent(email)}`);
						break;
					case 'PasswordResetRequiredException':
						goto(`/auth/reset-password?email=${encodeURIComponent(email)}`);
						break;
					case 'NotAuthorizedException':
					case 'InvalidPasswordException': // cognito-local uses this instead of NotAuthorizedException
						passwordError = 'Incorrect username or password.';
						break;
					case 'UserNotFoundException':
						emailError = 'User not found';
						break;
					default:
						errorMessage = error.message || 'Sign in failed';
				}
			} else {
				errorMessage = error instanceof Error ? error.message : 'Sign in failed';
			}
		} finally {
			loading = false;
		}
	}
</script>

<div class="container h-full mx-auto flex justify-center items-center">
	<Card class="p-8 w-full max-w-md">
		<div class="flex justify-center mb-6">
			<div class="flex items-center gap-3">
				<div class="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
					<span class="text-primary font-bold text-2xl">SL</span>
				</div>
				<div class="flex flex-col">
					<span class="font-semibold text-lg">Serverless Launchpad</span>
					<span class="text-sm text-muted-foreground">Svelte Edition</span>
				</div>
			</div>
		</div>
		<hr class="mb-6 border-border" />

		<CardContent>
			{#if checkingAuth}
				<div class="flex justify-center py-8">
					<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
				</div>
			{:else}
				<form on:submit={handleSubmit} class="space-y-4">
				{#if errorMessage}
					<div class="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
						<div class="flex items-start gap-3">
							<AlertCircle class="h-5 w-5 text-destructive mt-0.5" />
							<p class="text-sm text-destructive">{errorMessage}</p>
						</div>
					</div>
				{/if}

				<div class="space-y-2">
					<Label for="email">Email *</Label>
					<Input
						id="email"
						type="email"
						bind:value={email}
						required
						disabled={loading}
						placeholder="your@email.com"
						on:input={() => emailError = ''}
					/>
					{#if emailError}
						<p class="text-sm text-destructive">{emailError}</p>
					{/if}
				</div>

				<div class="space-y-2">
					<Label for="password">Password *</Label>
					<div class="relative">
						<Input
							id="password"
							type={showPassword ? 'text' : 'password'}
							bind:value={password}
							required
							disabled={loading}
							class="pr-10"
							on:input={() => passwordError = ''}
						/>
						<button
							type="button"
							on:click={() => showPassword = !showPassword}
							class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
							aria-label={showPassword ? 'Hide password' : 'Show password'}
						>
							{#if showPassword}
								<EyeOff class="h-4 w-4" />
							{:else}
								<Eye class="h-4 w-4" />
							{/if}
						</button>
					</div>
					{#if passwordError}
						<p class="text-sm text-destructive">
							{passwordError}
							<a href="/auth/reset-password" class="underline hover:text-destructive/80">Forgot password?</a>
						</p>
					{/if}
				</div>

				<Button type="submit" class="w-full" disabled={loading}>
					{loading ? 'Signing in...' : 'Sign In'}
				</Button>

				<div class="text-center text-sm text-muted-foreground">
					Don't have an account? <a href="/auth/signup" class="text-primary hover:underline">Sign Up</a>
				</div>
			</form>
			{/if}
		</CardContent>
	</Card>
</div>
