<script lang="ts">
	import type { Snippet } from "svelte";
	import { cn } from "$lib/utils.js";

	let { class: className, children, ...rest }: { class?: string; children?: Snippet; [key: string]: unknown } = $props();
</script>

<div data-slot="card-content" class={cn("p-6 pt-0", className)} {...rest}>
	{@render children?.()}
</div>
