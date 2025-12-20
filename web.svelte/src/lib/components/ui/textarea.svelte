<script lang="ts">
	import type { HTMLTextareaAttributes } from "svelte/elements";
	import { cn } from "$lib/utils";

	type $$Props = Omit<HTMLTextareaAttributes, 'class' | 'value'> & {
		class?: string | null | undefined;
		value?: string | undefined;
	};

	let className: string | undefined | null = undefined;
	export { className as class };
	export let value: string | undefined = undefined;
</script>

<textarea
	class={cn(
		"flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
		className
	)}
	bind:value
	on:blur
	on:change
	on:click
	on:focus
	on:keydown
	on:keypress
	on:keyup
	on:mouseover
	on:mouseenter
	on:mouseleave
	on:paste
	on:input
	{...$$restProps}
></textarea>
