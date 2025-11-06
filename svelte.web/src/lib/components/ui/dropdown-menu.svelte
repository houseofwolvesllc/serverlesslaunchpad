<script lang="ts" context="module">
	import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui";

	export const Root = DropdownMenuPrimitive.Root;
	export const Trigger = DropdownMenuPrimitive.Trigger;
	export const Group = DropdownMenuPrimitive.Group;
	export const Sub = DropdownMenuPrimitive.Sub;
	export const SubTrigger = DropdownMenuPrimitive.SubTrigger;
	export const RadioGroup = DropdownMenuPrimitive.RadioGroup;
</script>

<script lang="ts">
	export let open = false;
</script>

<DropdownMenuPrimitive.Root bind:open>
	<slot />
</DropdownMenuPrimitive.Root>
