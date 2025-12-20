<script lang="ts">
	import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui";
	import { cn } from "$lib/utils";

	type $$Props = DropdownMenuPrimitive.ItemProps & {
		inset?: boolean;
	};

	let className: string | undefined = undefined;
	export { className as class };
	export let inset: boolean = false;
</script>

<DropdownMenuPrimitive.Item
	class={cn(
		"relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
		inset && "pl-8",
		className
	)}
	{...$$restProps}
	on:click
>
	<slot />
</DropdownMenuPrimitive.Item>
