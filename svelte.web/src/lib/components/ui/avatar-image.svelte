<script lang="ts">
	import { Avatar as AvatarPrimitive } from "bits-ui";
	import { cn } from "$lib/utils";

	type $$Props = AvatarPrimitive.ImageProps;

	let className: string | undefined = undefined;
	export { className as class };
</script>

<AvatarPrimitive.Image class={cn("aspect-square h-full w-full", className)} {...$$restProps} />
