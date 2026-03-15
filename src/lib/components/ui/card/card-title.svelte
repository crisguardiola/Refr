<script lang="ts">
	import type { Snippet } from "svelte";
	import { cn } from "$lib/utils.js";

	let {
		class: className,
		tag = "h3",
		children,
		...rest
	}: { class?: string; tag?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6"; children?: Snippet; [key: string]: unknown } = $props();
</script>

<svelte:element
	this={tag}
	data-slot="card-title"
	class={cn("text-2xl font-semibold leading-none tracking-tight", className)}
	{...rest}
>
	{@render children?.()}
</svelte:element>
