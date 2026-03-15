<script lang="ts">
	import type { Snippet } from "svelte";
	import { cn } from "$lib/utils.js";

	let { class: className, children, ...rest }: { class?: string; children?: Snippet; [key: string]: unknown } = $props();
</script>

<div data-slot="card-header" class={cn("flex flex-col space-y-1.5 p-6", className)} {...rest}>
	{@render children?.()}
</div>
