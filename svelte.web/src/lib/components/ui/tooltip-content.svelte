<script lang="ts">
	import { Tooltip as TooltipPrimitive } from "bits-ui";
	import { cn } from "$lib/utils";
	import { flyAndScale } from "$lib/utils";

	type $$Props = TooltipPrimitive.ContentProps;

	let className: string | undefined = undefined;
	export { className as class };
	export let sideOffset = 4;
</script>

<TooltipPrimitive.Content
	transition={flyAndScale}
	{sideOffset}
	class={cn(
		"z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground",
		className
	)}
	{...$$restProps}
>
	<slot />
</TooltipPrimitive.Content>
