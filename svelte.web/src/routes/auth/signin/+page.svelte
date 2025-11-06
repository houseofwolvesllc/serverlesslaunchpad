<script lang="ts">
	import { goto } from '$app/navigation';
	import { signIn, SignInStep } from '$lib/auth';
	import { authStore } from '$lib/stores/auth_store';
	import { logger } from '$lib/logging/logger';
	import Input from '$lib/components/ui/input.svelte';
	import Label from '$lib/components/ui/label.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import Card from '$lib/components/ui/card.svelte';
	import CardHeader from '$lib/components/ui/card-header.svelte';
	import CardContent from '$lib/components/ui/card-content.svelte';
	import { AlertCircle } from 'lucide-svelte';

	let email = '';
	let password = '';
	let loading = false;
	let errorMessage = '';

	async function handleSubmit(event: Event) {
		event.preventDefault();
		loading = true;
		errorMessage = '';

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
			errorMessage = error instanceof Error ? error.message : 'Sign in failed';
		} finally {
			loading = false;
		}
	}
</script>

<div class="container h-full mx-auto flex justify-center items-center">
	<Card class="p-8 w-full max-w-md">
		<div class="flex justify-center mb-8">
			<img src="/svg/serverless_launchpad_logo.svg" alt="Serverless Launchpad" class="h-24" />
		</div>

		<CardHeader class="mb-6">
			<h2 class="text-2xl font-semibold">Sign In</h2>
		</CardHeader>

		<CardContent>
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
					/>
				</div>

				<div class="space-y-2">
					<Label for="password">Password *</Label>
					<Input
						id="password"
						type="password"
						bind:value={password}
						required
						disabled={loading}
					/>
				</div>

				<div class="flex justify-between items-center">
					<a href="/auth/reset-password" class="text-sm text-primary hover:underline">
						Forgot Password?
					</a>
				</div>

				<Button type="submit" class="w-full" disabled={loading}>
					{loading ? 'Signing in...' : 'Sign In'}
				</Button>

				<div class="text-center text-sm text-muted-foreground">
					Don't have an account? <a href="/auth/signup" class="text-primary hover:underline">Sign Up</a>
				</div>
			</form>
		</CardContent>
	</Card>
</div>
