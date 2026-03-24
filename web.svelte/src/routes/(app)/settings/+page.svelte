<!--
  Settings Page

  User-facing settings with theme/appearance controls.
  Radio buttons for each theme option with label and description.
  Core modes (Light, Dark, Auto) are separated from Color Themes by a divider.
-->

<script lang="ts">
	import Card from '$lib/components/ui/card.svelte';
	import CardHeader from '$lib/components/ui/card-header.svelte';
	import CardContent from '$lib/components/ui/card-content.svelte';
	import { themeStore, type Theme } from '$lib/stores/theme_store';
	import { cn } from '$lib/utils';

	interface ThemeOption {
		value: Theme;
		label: string;
		description: string;
	}

	const CORE_MODES: ThemeOption[] = [
		{ value: 'light', label: 'Light', description: 'Clean, bright interface' },
		{ value: 'dark', label: 'Dark', description: 'Easy on the eyes' },
		{ value: 'auto', label: 'Auto', description: 'Adjusts based on time of day' },
	];

	const COLOR_THEMES: ThemeOption[] = [
		{ value: 'midnight', label: 'Midnight', description: 'Deep indigo with violet accents' },
		{ value: 'emerald', label: 'Emerald', description: 'Forest green with mint accents' },
		{ value: 'sunset', label: 'Sunset', description: 'Warm brown with amber accents' },
		{ value: 'charcoal', label: 'Charcoal', description: 'True neutral gray, no color tint' },
	];

	function handleSelect(value: Theme) {
		themeStore.setTheme(value);
	}

	$: currentTheme = $themeStore;
</script>

<div class="space-y-6">
	<!-- Page Header -->
	<div class="space-y-1">
		<h1 class="text-3xl font-bold tracking-tight">Settings</h1>
		<p class="text-muted-foreground">
			Manage your application preferences
		</p>
	</div>

	<!-- Appearance Section -->
	<Card>
		<CardHeader>
			<h2 class="text-lg font-semibold leading-none tracking-tight">Appearance</h2>
			<p class="text-sm text-muted-foreground">
				Customize the look and feel of the application
			</p>
		</CardHeader>
		<CardContent>
			<div role="radiogroup" aria-label="Theme selection" class="space-y-6">
				<!-- Core Modes -->
				<div class="space-y-3">
					{#each CORE_MODES as option (option.value)}
						{@const selected = currentTheme === option.value}
						{@const isRecommended = option.value === 'auto'}
						<button
							type="button"
							role="radio"
							aria-checked={selected}
							on:click={() => handleSelect(option.value)}
							class={cn(
								'flex items-start gap-3 w-full rounded-lg border p-4 text-left transition-colors',
								selected
									? 'border-primary bg-primary/5'
									: 'border-border hover:border-primary/40 hover:bg-accent/50'
							)}
						>
							<div class="mt-0.5">
								<div
									class={cn(
										'h-4 w-4 rounded-full border-2 flex items-center justify-center',
										selected ? 'border-primary' : 'border-muted-foreground/40'
									)}
								>
									{#if selected}
										<div class="h-2 w-2 rounded-full bg-primary"></div>
									{/if}
								</div>
							</div>
							<div class="flex-1 space-y-1">
								<span class="text-sm font-medium leading-none">
									{option.label}
									{#if isRecommended}
										<span class="ml-2 text-xs text-muted-foreground font-normal">(Recommended)</span>
									{/if}
								</span>
								<p class="text-sm text-muted-foreground">{option.description}</p>
							</div>
						</button>
					{/each}
				</div>

				<!-- Divider -->
				<div class="flex items-center gap-4">
					<div class="flex-1 h-px bg-border"></div>
					<span class="text-xs text-muted-foreground uppercase tracking-wider font-medium">Color Themes</span>
					<div class="flex-1 h-px bg-border"></div>
				</div>

				<!-- Color Themes -->
				<div class="space-y-3">
					{#each COLOR_THEMES as option (option.value)}
						{@const selected = currentTheme === option.value}
						<button
							type="button"
							role="radio"
							aria-checked={selected}
							on:click={() => handleSelect(option.value)}
							class={cn(
								'flex items-start gap-3 w-full rounded-lg border p-4 text-left transition-colors',
								selected
									? 'border-primary bg-primary/5'
									: 'border-border hover:border-primary/40 hover:bg-accent/50'
							)}
						>
							<div class="mt-0.5">
								<div
									class={cn(
										'h-4 w-4 rounded-full border-2 flex items-center justify-center',
										selected ? 'border-primary' : 'border-muted-foreground/40'
									)}
								>
									{#if selected}
										<div class="h-2 w-2 rounded-full bg-primary"></div>
									{/if}
								</div>
							</div>
							<div class="flex-1 space-y-1">
								<span class="text-sm font-medium leading-none">
									{option.label}
								</span>
								<p class="text-sm text-muted-foreground">{option.description}</p>
							</div>
						</button>
					{/each}
				</div>
			</div>
		</CardContent>
	</Card>
</div>
