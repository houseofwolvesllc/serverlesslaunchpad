<script lang="ts">
	import { Drawer as SheetPrimitive } from "vaul-svelte";
	import { cn } from "$lib/utils";

	type $$Props = SheetPrimitive.OverlayProps & {
		class?: string | null | undefined;
	};

	let className: string | null | undefined = undefined;
	export { className as class };
</script>

<SheetPrimitive.Overlay
	class={cn("fixed inset-0 z-50 bg-black/80", className)}
	{...$$restProps}
/>
