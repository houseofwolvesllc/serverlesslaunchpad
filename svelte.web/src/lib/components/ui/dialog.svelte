<script lang="ts" context="module">
	import { Dialog as DialogPrimitive } from "bits-ui";

	export const Root = DialogPrimitive.Root;
	export const Trigger = DialogPrimitive.Trigger;
	export const Portal = DialogPrimitive.Portal;
	export const Close = DialogPrimitive.Close;
</script>

<script lang="ts">
	export let open = false;
</script>

<DialogPrimitive.Root bind:open>
	<slot />
</DialogPrimitive.Root>
