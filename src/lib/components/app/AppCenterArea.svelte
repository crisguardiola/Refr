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

	/** Zoom level 0–100: 50 = 5 cols (default), 0 = more cols, 100 = fewer cols */
	const thumbnailZoomStore = writable(50);
	setContext('thumbnailZoom', thumbnailZoomStore);
</script>

<div
	class="flex min-h-0 min-w-0 flex-1 flex-col"
	data-slot="app-center"
>
	<!-- Search bar: fixed at top, no scroll -->
	<div class="z-20 flex min-h-[var(--content-header-height)] shrink-0 flex-col justify-center bg-background/95 px-8 pt-4 pb-6 backdrop-blur-xl">
		<div>
			<SearchAndFilterBar
				{tags}
				{tagCounts}
				{filterStore}
			/>
		</div>
	</div>
	<!-- Content area: scrollbar only here, within screenshot area -->
	<div class="min-h-0 flex-1 overflow-y-auto p-8 pt-0">
		{@render children?.()}
	</div>
</div>
