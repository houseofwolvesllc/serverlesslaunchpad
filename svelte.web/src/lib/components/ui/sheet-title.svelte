<script lang="ts">
	import { Drawer as SheetPrimitive } from "vaul-svelte";
	import { cn } from "$lib/utils";

	type $$Props = SheetPrimitive.TitleProps;

	let className: string | undefined = undefined;
	export { className as class };
</script>

<SheetPrimitive.Title
	class={cn("text-lg font-semibold text-foreground", className)}
	{...$$restProps}
>
	<slot />
</SheetPrimitive.Title>
