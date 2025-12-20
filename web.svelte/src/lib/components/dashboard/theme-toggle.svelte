<script lang="ts">
	import { toggleMode } from 'mode-watcher';
	import { Moon, Sun } from 'lucide-svelte';
	import Button from '$lib/components/ui/button.svelte';

	let className: string | undefined = undefined;
	export { className as class };
</script>

<Button
	variant="ghost"
	size="icon"
	on:click={toggleMode}
	class={className}
	aria-label="Toggle theme"
>
	<Sun class="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
	<Moon
		class="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
	/>
	<span class="sr-only">Toggle theme</span>
</Button>
