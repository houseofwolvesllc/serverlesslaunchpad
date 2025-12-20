<script lang="ts">
	import { goto } from '$app/navigation';
	import { signUp, SignInStep } from '$lib/auth';
	import { logger } from '$lib/logging/logger';
	import { Eye, EyeOff, AlertCircle } from 'lucide-svelte';
	import Card from '$lib/components/ui/card.svelte';
	import CardHeader from '$lib/components/ui/card-header.svelte';
	import CardContent from '$lib/components/ui/card-content.svelte';
	import Label from '$lib/components/ui/label.svelte';
	import Input from '$lib/components/ui/input.svelte';
	import Button from '$lib/components/ui/button.svelte';

	let email = '';
	let password = '';
	let firstName = '';
	let lastName = '';
	let loading = false;
	let errorMessage = '';
	let showPassword = false;

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
			<form on:submit={handleSubmit} class="space-y-4">
				{#if errorMessage}
					<div class="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
						<div class="flex items-start gap-3">
							<AlertCircle class="h-5 w-5 text-destructive mt-0.5" />
							<p class="text-sm text-destructive">{errorMessage}</p>
						</div>
					</div>
				{/if}

				<div class="grid grid-cols-2 gap-4">
					<div class="space-y-2">
						<Label for="firstName">First Name *</Label>
						<Input
							id="firstName"
							type="text"
							bind:value={firstName}
							required
							disabled={loading}
						/>
					</div>

					<div class="space-y-2">
						<Label for="lastName">Last Name *</Label>
						<Input
							id="lastName"
							type="text"
							bind:value={lastName}
							required
							disabled={loading}
						/>
					</div>
				</div>

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
					<div class="relative">
						<Input
							id="password"
							type={showPassword ? 'text' : 'password'}
							bind:value={password}
							required
							disabled={loading}
							class="pr-10"
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
					<p class="text-xs text-muted-foreground">
						Must be at least 8 characters with uppercase, lowercase, number, and special character
					</p>
				</div>

				<Button type="submit" class="w-full" disabled={loading}>
					{loading ? 'Creating account...' : 'Sign Up'}
				</Button>

				<p class="text-center text-sm text-muted-foreground">
					Already have an account? <a href="/auth/signin" class="text-primary hover:underline">Sign In</a>
				</p>
			</form>
		</CardContent>
	</Card>
</div>
