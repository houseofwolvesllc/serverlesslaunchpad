<script lang="ts">
	import { Drawer as SheetPrimitive } from "vaul-svelte";
	import { cn } from "$lib/utils";

	type $$Props = SheetPrimitive.DescriptionProps;

	let className: string | undefined = undefined;
	export { className as class };
</script>

<SheetPrimitive.Description
	class={cn("text-sm text-muted-foreground", className)}
	{...$$restProps}
>
	<slot />
</SheetPrimitive.Description>
