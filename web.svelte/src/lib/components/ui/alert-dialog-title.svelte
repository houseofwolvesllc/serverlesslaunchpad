<script lang="ts">
	import { AlertDialog as AlertDialogPrimitive } from "bits-ui";
	import { cn } from "$lib/utils";

	type $$Props = AlertDialogPrimitive.TitleProps & {
		class?: string | null | undefined;
	};

	let className: string | null | undefined = undefined;
	export { className as class };
</script>

<AlertDialogPrimitive.Title
	class={cn("text-lg font-semibold", className)}
	{...$$restProps}
>
	<slot />
</AlertDialogPrimitive.Title>
