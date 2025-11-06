<script lang="ts">
	import { AlertDialog as AlertDialogPrimitive } from "bits-ui";
	import Button from "./button.svelte";

	type $$Props = AlertDialogPrimitive.ActionProps;
</script>

<AlertDialogPrimitive.Action asChild let:builder {...$$restProps}>
	<Button builders={[builder]} {...$$restProps}>
		<slot />
	</Button>
</AlertDialogPrimitive.Action>
