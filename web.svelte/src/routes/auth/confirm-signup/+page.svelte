<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { confirmSignUp, resendConfirmationCode, SignInStep } from '$lib/auth';
	import { logger } from '$lib/logging/logger';
	import { onMount } from 'svelte';
	import Input from '$lib/components/ui/input.svelte';
	import Label from '$lib/components/ui/label.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import Card from '$lib/components/ui/card.svelte';
	import CardHeader from '$lib/components/ui/card-header.svelte';
	import CardContent from '$lib/components/ui/card-content.svelte';
	import { AlertCircle, CheckCircle } from 'lucide-svelte';

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

		<CardHeader class="mb-6">
			<h2 class="text-2xl font-semibold">Confirm Your Sign Up</h2>
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

				{#if successMessage}
					<div class="rounded-lg border border-green-500/50 bg-green-500/10 p-4">
						<div class="flex items-start gap-3">
							<CheckCircle class="h-5 w-5 text-green-600 mt-0.5" />
							<p class="text-sm text-green-600">{successMessage}</p>
						</div>
					</div>
				{/if}

				<div class="space-y-2">
					<Label for="confirmationCode">Confirmation Code *</Label>
					<Input
						id="confirmationCode"
						type="text"
						bind:value={confirmationCode}
						required
						disabled={loading}
						placeholder="Enter code from email"
					/>
				</div>

				<div class="flex justify-between items-center">
					<button
						type="button"
						class="text-sm text-primary hover:underline"
						on:click={handleResend}
						disabled={loading}
					>
						Resend Code
					</button>

					<Button type="submit" disabled={loading}>
						{loading ? 'Confirming...' : 'Confirm'}
					</Button>
				</div>
			</form>
		</CardContent>
	</Card>
</div>
