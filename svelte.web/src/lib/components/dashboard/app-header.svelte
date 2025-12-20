<script lang="ts">
	import { sidebarStore } from '$lib/stores/sidebar_store';
	import { Menu, Search, HelpCircle } from 'lucide-svelte';
	import Breadcrumbs from './breadcrumbs.svelte';
	import ThemeToggle from './theme-toggle.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import { cn } from '$lib/utils';

	let className: string | undefined = undefined;
	export { className as class };
</script>

<header
	class={cn(
		'sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-6',
		className
	)}
>
	<!-- Mobile Menu Button -->
	<Button
		variant="ghost"
		size="icon"
		class="lg:hidden"
		on:click={() => sidebarStore.toggleMobile()}
		aria-label="Toggle menu"
	>
		<Menu class="h-5 w-5" />
	</Button>

	<!-- Breadcrumbs -->
	<Breadcrumbs class="hidden md:flex flex-1" />

	<!-- Right side actions -->
	<div class="flex items-center gap-2 md:ml-auto">
		<!-- Search Button -->
		<Button
			variant="ghost"
			size="icon"
			disabled
			aria-label="Search"
			title="Search (coming soon)"
		>
			<Search class="h-5 w-5" />
		</Button>

		<!-- Help Button -->
		<Button
			variant="ghost"
			size="icon"
			disabled
			aria-label="Help"
			title="Help (coming soon)"
		>
			<HelpCircle class="h-5 w-5" />
		</Button>

		<!-- Theme Toggle -->
		<ThemeToggle />
	</div>
</header>
