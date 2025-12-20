<script lang="ts">
	import { AlertDialog as AlertDialogPrimitive } from "bits-ui";
	import { cn } from "$lib/utils";

	type $$Props = AlertDialogPrimitive.DescriptionProps & {
		class?: string | null | undefined;
	};

	let className: string | null | undefined = undefined;
	export { className as class };
</script>

<AlertDialogPrimitive.Description
	class={cn("text-sm text-muted-foreground", className)}
	{...$$restProps}
>
	<slot />
</AlertDialogPrimitive.Description>
