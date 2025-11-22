<script lang="ts">
	import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui";
	import { cn } from "$lib/utils";
	import { flyAndScale } from "$lib/utils";

	type $$Props = DropdownMenuPrimitive.ContentProps & {
		class?: string | null | undefined;
	};

	let className: string | null | undefined = undefined;
	export { className as class };
	export let sideOffset = 4;
</script>

<DropdownMenuPrimitive.Content
	transition={flyAndScale}
	{sideOffset}
	class={cn(
		"z-50 min-w-[8rem] rounded-md border bg-popover p-1 text-popover-foreground shadow-md focus:outline-none",
		className
	)}
	{...$$restProps}
>
	<slot />
</DropdownMenuPrimitive.Content>
