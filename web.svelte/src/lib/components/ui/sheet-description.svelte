<script lang="ts">
	import { Drawer as SheetPrimitive } from "vaul-svelte";
	import { cn } from "$lib/utils";

	type $$Props = SheetPrimitive.DescriptionProps & {
		class?: string | null | undefined;
	};

	let className: string | null | undefined = undefined;
	export { className as class };
</script>

<SheetPrimitive.Description
	class={cn("text-sm text-muted-foreground", className)}
	{...$$restProps}
>
	<slot />
</SheetPrimitive.Description>
