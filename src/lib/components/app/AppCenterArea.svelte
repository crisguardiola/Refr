<script lang="ts">
	import { setContext } from 'svelte';
	import { writable } from 'svelte/store';
	import type { Snippet } from 'svelte';
	import SearchAndFilterBar from './SearchAndFilterBar.svelte';

	type Tag = { id: number; dimension: string; label: string; sortOrder: number };

	let {
		children,
		tags = []
	}: {
		children?: Snippet;
		tags?: Tag[];
	} = $props();

	const filterStore = writable<{ searchQuery: string; selectedTagIds: number[]; selectedRating: number | null }>({
		searchQuery: '',
		selectedTagIds: [],
		selectedRating: null
	});
	setContext('screenshotFilters', filterStore);
</script>

<div
	class="flex min-h-0 flex-1 flex-col overflow-auto border-e border-border bg-muted/30 p-8"
	data-slot="app-center"
>
	<div class="mb-6">
		<SearchAndFilterBar
			{tags}
			{filterStore}
		/>
	</div>
	{@render children?.()}
</div>
