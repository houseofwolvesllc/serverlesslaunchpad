<script lang="ts">
	import { Checkbox as CheckboxPrimitive } from "bits-ui";
	import { Check, Minus } from "lucide-svelte";
	import { cn } from "$lib/utils";

	type $$Props = CheckboxPrimitive.Props;

	let className: string | undefined = undefined;
	export { className as class };
	export let checked: boolean | "indeterminate" = false;

	// Sync internal state with external checked prop
	let internalChecked = checked;
	$: internalChecked = checked;
</script>

<CheckboxPrimitive.Root
	bind:checked={internalChecked}
	class={cn(
		"peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
		className
	)}
	{...$$restProps}
>
	<CheckboxPrimitive.Indicator class="flex h-full w-full items-center justify-center text-current">
		{#if internalChecked === "indeterminate"}
			<Minus class="h-3.5 w-3.5" />
		{:else}
			<Check class="h-3.5 w-3.5" />
		{/if}
	</CheckboxPrimitive.Indicator>
</CheckboxPrimitive.Root>
