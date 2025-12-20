<script lang="ts">
	import { cn } from "$lib/utils";
	import { tv, type VariantProps } from "tailwind-variants";

	const alertVariants = tv({
		base: "relative w-full rounded-lg border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7",
		variants: {
			variant: {
				default: "bg-background text-foreground",
				destructive:
					"border-destructive/50 bg-destructive/10 text-destructive dark:border-destructive [&>svg]:text-destructive",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	});

	type Variant = VariantProps<typeof alertVariants>["variant"];

	type $$Props = {
		variant?: Variant;
		class?: string;
	};

	export let variant: Variant = "default";
	let className: string | undefined | null = undefined;
	export { className as class };
</script>

<div class={cn(alertVariants({ variant }), className)} role="alert" {...$$restProps}>
	<slot />
</div>
