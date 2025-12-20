<script lang="ts">
	import { AlertDialog as AlertDialogPrimitive } from "bits-ui";
	import Button from "./button.svelte";

	type $$Props = AlertDialogPrimitive.CancelProps;
</script>

<AlertDialogPrimitive.Cancel asChild let:builder {...$$restProps}>
	<Button builders={[builder]} variant="outline" {...$$restProps}>
		<slot />
	</Button>
</AlertDialogPrimitive.Cancel>
