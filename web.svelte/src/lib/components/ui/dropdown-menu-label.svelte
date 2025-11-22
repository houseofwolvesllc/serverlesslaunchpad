<script lang="ts">
	import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui";
	import { cn } from "$lib/utils";

	type $$Props = DropdownMenuPrimitive.LabelProps & {
		inset?: boolean;
		class?: string | null | undefined;
	};

	let className: string | null | undefined = undefined;
	export { className as class };
	export let inset: boolean = false;
</script>

<DropdownMenuPrimitive.Label
	class={cn("px-2 py-1.5 text-sm font-semibold", inset && "pl-8", className)}
	{...$$restProps}
>
	<slot />
</DropdownMenuPrimitive.Label>
