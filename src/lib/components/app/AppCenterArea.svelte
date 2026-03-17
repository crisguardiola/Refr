<script lang="ts">
	import { setContext } from 'svelte';
	import { writable } from 'svelte/store';
	import type { Snippet } from 'svelte';
	import SearchAndFilterBar from './SearchAndFilterBar.svelte';

	type Tag = { id: number; dimension: string; label: string; sortOrder: number };

	let {
		children,
		tags = [],
		tagCounts = {}
	}: {
		children?: Snippet;
		tags?: Tag[];
		tagCounts?: Record<number, number>;
	} = $props();

	const filterStore = writable<{ searchQuery: string; selectedTagIds: number[]; favouritesOnly: boolean }>({
		searchQuery: '',
		selectedTagIds: [],
		favouritesOnly: false
	});
	setContext('screenshotFilters', filterStore);

	/** Zoom level 0–100: 0 = smallest thumbnails (8 cols), 100 = biggest (2 cols) */
	const thumbnailZoomStore = writable(50);
	setContext('thumbnailZoom', thumbnailZoomStore);
</script>

<div
	class="flex min-h-0 flex-1 flex-col overflow-auto border-e border-border bg-muted/30 p-8"
	data-slot="app-center"
>
	<div class="mb-6">
		<SearchAndFilterBar
			{tags}
			{tagCounts}
			{filterStore}
			{thumbnailZoomStore}
		/>
	</div>
	{@render children?.()}
</div>
