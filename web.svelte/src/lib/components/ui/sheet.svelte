<script lang="ts" context="module">
	import { Drawer as SheetPrimitive } from "vaul-svelte";

	export const Root = SheetPrimitive.Root;
	export const Trigger = SheetPrimitive.Trigger;
	export const Portal = SheetPrimitive.Portal;
	export const Close = SheetPrimitive.Close;
	export const Overlay = SheetPrimitive.Overlay;
</script>

<script lang="ts">
	export let open = false;
</script>

<SheetPrimitive.Root bind:open>
	<slot />
</SheetPrimitive.Root>
