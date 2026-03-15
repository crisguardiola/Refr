<script lang="ts">
	import type { Snippet } from "svelte";
	import { cn } from "$lib/utils.js";

	let { class: className, children, ...rest }: { class?: string; children?: Snippet; [key: string]: unknown } = $props();
</script>

<p data-slot="card-description" class={cn("text-muted-foreground text-sm", className)} {...rest}>
	{@render children?.()}
</p>
