<script lang="ts">
	import { AlertCircle } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import Card from './card.svelte';
	import CardHeader from './card-header.svelte';
	import CardContent from './card-content.svelte';

	export let title = 'Page Not Found';
	export let message = 'The page you are looking for does not exist or you do not have permission to access it.';
</script>

<div class="flex items-center justify-center min-h-[400px] p-4">
	<Card class="w-full max-w-md">
		<CardHeader>
			<div class="flex items-center gap-3">
				<AlertCircle class="w-8 h-8 text-destructive" />
				<h2 class="text-2xl font-semibold leading-none tracking-tight">{title}</h2>
			</div>
		</CardHeader>
		<CardContent class="space-y-4">
			<p class="text-sm text-muted-foreground">{message}</p>
			<button
				class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-10 px-4 py-2 w-full"
				on:click={() => goto('/dashboard')}
			>
				Go to Dashboard
			</button>
		</CardContent>
	</Card>
</div>
