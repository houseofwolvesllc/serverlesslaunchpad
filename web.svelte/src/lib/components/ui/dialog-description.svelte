<script lang="ts">
	import { Dialog as DialogPrimitive } from "bits-ui";
	import { cn } from "$lib/utils";

	type $$Props = DialogPrimitive.DescriptionProps & {
		class?: string | null | undefined;
	};

	let className: string | null | undefined = undefined;
	export { className as class };
</script>

<DialogPrimitive.Description
	class={cn("text-sm text-muted-foreground", className)}
	{...$$restProps}
>
	<slot />
</DialogPrimitive.Description>
