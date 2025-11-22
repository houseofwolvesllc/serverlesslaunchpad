<script lang="ts">
	import { Drawer as SheetPrimitive } from "vaul-svelte";
	import { cn } from "$lib/utils";

	type $$Props = SheetPrimitive.TitleProps & {
		class?: string | null | undefined;
	};

	let className: string | null | undefined = undefined;
	export { className as class };
</script>

<SheetPrimitive.Title
	class={cn("text-lg font-semibold text-foreground", className)}
	{...$$restProps}
>
	<slot />
</SheetPrimitive.Title>
