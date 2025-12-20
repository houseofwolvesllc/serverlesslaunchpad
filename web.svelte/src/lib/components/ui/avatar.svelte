<script lang="ts">
	import { Avatar as AvatarPrimitive } from "bits-ui";
	import { cn } from "$lib/utils";

	type $$Props = AvatarPrimitive.Props;

	let className: string | undefined = undefined;
	export { className as class };
</script>

<AvatarPrimitive.Root
	class={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className)}
	{...$$restProps}
>
	<slot />
</AvatarPrimitive.Root>
