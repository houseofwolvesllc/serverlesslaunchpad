<script lang="ts">
	import { goto } from '$app/navigation';
	import { resetPassword } from '$lib/auth';
	import { logger } from '$lib/logging/logger';
	import Input from '$lib/components/ui/input.svelte';
	import Label from '$lib/components/ui/label.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import Card from '$lib/components/ui/card.svelte';
	import CardHeader from '$lib/components/ui/card-header.svelte';
	import CardContent from '$lib/components/ui/card-content.svelte';
	import { AlertCircle, CheckCircle } from 'lucide-svelte';

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
			<h2 class="text-2xl font-semibold">Reset Your Password</h2>
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

				<Button type="submit" class="w-full" disabled={loading}>
					{loading ? 'Sending code...' : 'Reset Password'}
				</Button>

				<div class="text-center text-sm text-muted-foreground">
					Remember your password? <a href="/auth/signin" class="text-primary hover:underline">Sign In</a>
				</div>
			</form>
		</CardContent>
	</Card>
</div>
