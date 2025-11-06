<script lang="ts" context="module">
	import { AlertDialog as AlertDialogPrimitive } from "bits-ui";

	export const Root = AlertDialogPrimitive.Root;
	export const Trigger = AlertDialogPrimitive.Trigger;
	export const Portal = AlertDialogPrimitive.Portal;
</script>

<script lang="ts">
	export let open = false;
</script>

<AlertDialogPrimitive.Root bind:open>
	<slot />
</AlertDialogPrimitive.Root>
