<script lang="ts">
	import { cn } from '$lib/utils.js';
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import { ImageIcon } from '@lucide/svelte';

	let { detailOpen = $bindable(false) }: { detailOpen?: boolean } = $props();
</script>

<!-- Desktop: always visible fixed column -->
<aside
	class={cn(
		'hidden w-80 shrink-0 flex-col overflow-auto border-s border-border bg-background p-4',
		'lg:flex'
	)}
	data-slot="app-right-sidebar"
>
	<div class="flex flex-1 flex-col items-center justify-center gap-4 py-12 text-center">
		<ImageIcon class="size-12 text-muted-foreground" aria-hidden="true" />
		<p class="text-muted-foreground text-sm">Select a screenshot to view details</p>
	</div>
</aside>

<!-- Mobile/Tablet: Sheet overlay when screenshot selected (controlled by detailOpen) -->
<Sheet.Root bind:open={detailOpen}>
	<Sheet.Content side="right" class="w-full sm:max-w-md">
		<Sheet.Header>
			<Sheet.Title>Screenshot details</Sheet.Title>
			<Sheet.Description>View and edit screenshot information</Sheet.Description>
		</Sheet.Header>
		<div class="flex flex-col items-center justify-center gap-4 py-12 text-center">
			<ImageIcon class="size-12 text-muted-foreground" aria-hidden="true" />
			<p class="text-muted-foreground text-sm">Select a screenshot to view details</p>
		</div>
	</Sheet.Content>
</Sheet.Root>
