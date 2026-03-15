<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children }: { children?: Snippet } = $props();
</script>

<div
	class="flex min-h-0 flex-1 flex-col overflow-auto border-e border-border bg-muted/30 p-8"
	data-slot="app-center"
>
	{@render children?.()}
</div>
