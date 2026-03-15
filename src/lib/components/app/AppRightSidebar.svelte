<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { cloudinaryUrl } from '$lib/cloudinary.js';
	import { ImageIcon } from '@lucide/svelte';

	let {
		selectedScreenshot = null
	}: {
		selectedScreenshot?: { id: number; url: string; fileName: string; createdAt: Date | string } | null;
	} = $props();

	const formattedDate = $derived(
		selectedScreenshot?.createdAt
			? new Date(selectedScreenshot.createdAt).toLocaleDateString(undefined, {
					year: 'numeric',
					month: 'short',
					day: 'numeric',
					hour: '2-digit',
					minute: '2-digit'
				})
			: ''
	);
</script>

<aside
	class={cn(
		'flex w-64 shrink-0 flex-col overflow-auto border-s border-border bg-background p-4',
		'sm:w-72 lg:w-80'
	)}
	data-slot="app-right-sidebar"
>
	{#if selectedScreenshot}
		<div class="flex flex-col gap-6">
			<div class="space-y-2">
				<h3 class="text-sm font-semibold">Details</h3>
				<img
					src={cloudinaryUrl(selectedScreenshot.url, 'sidebar')}
					alt={selectedScreenshot.fileName}
					class="w-full rounded-lg border border-border object-cover"
				/>
			</div>
			<dl class="space-y-3 text-sm">
				<div>
					<dt class="text-muted-foreground">File name</dt>
					<dd class="mt-0.5 font-medium">{selectedScreenshot.fileName}</dd>
				</div>
				<div>
					<dt class="text-muted-foreground">Added</dt>
					<dd class="mt-0.5 font-medium">{formattedDate}</dd>
				</div>
			</dl>
		</div>
	{:else}
		<div class="flex flex-1 flex-col items-center justify-center gap-4 py-12 text-center">
			<ImageIcon class="size-12 text-muted-foreground" aria-hidden="true" />
			<p class="text-muted-foreground text-sm">Select a screenshot to view details</p>
		</div>
	{/if}
</aside>
