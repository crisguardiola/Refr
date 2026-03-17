<script lang="ts">
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Search, Filter, X, Heart } from '@lucide/svelte';
	import type { Writable } from 'svelte/store';

	type Tag = { id: number; dimension: string; label: string; sortOrder: number };

	const SEARCH_DEBOUNCE_MS = 200;
	const TAG_SEARCH_THRESHOLD = 6;
	const DIMENSION_LABELS: Record<string, string> = {
		screen: 'Screens',
		ui_type: 'UI Elements',
		color: 'Color',
		pattern: 'Pattern'
	};

	let {
		tags = [],
		tagCounts = {},
		filterStore,
		thumbnailZoomStore
	}: {
		tags?: Tag[];
		tagCounts?: Record<number, number>;
		filterStore: Writable<{ searchQuery: string; selectedTagIds: number[]; favouritesOnly: boolean }>;
		thumbnailZoomStore: Writable<number>;
	} = $props();

	let filterOpen = $state(false);
	let screensFilterOpen = $state(false);
	let favouritesFilterOpen = $state(false);
	let searchInputValue = $state('');
	let tagSearchQuery = $state('');
	let screenSearchQuery = $state('');
	let tagsRef: HTMLDetailsElement;
	let screensRef: HTMLDetailsElement;
	let favouritesRef: HTMLDetailsElement;

	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	$effect(() => {
		searchInputValue = $filterStore.searchQuery;
	});

	$effect(() => {
		if (!filterOpen) tagSearchQuery = '';
	});

	$effect(() => {
		if (!screensFilterOpen) screenSearchQuery = '';
	});

	$effect(() => {
		if (!filterOpen) return;
		function handleClickOutside(e: MouseEvent) {
			if (tagsRef && !tagsRef.contains(e.target as Node)) {
				filterOpen = false;
			}
		}
		document.addEventListener('click', handleClickOutside);
		return () => document.removeEventListener('click', handleClickOutside);
	});

	$effect(() => {
		if (!screensFilterOpen) return;
		function handleClickOutside(e: MouseEvent) {
			if (screensRef && !screensRef.contains(e.target as Node)) {
				screensFilterOpen = false;
			}
		}
		document.addEventListener('click', handleClickOutside);
		return () => document.removeEventListener('click', handleClickOutside);
	});

	$effect(() => {
		if (!favouritesFilterOpen) return;
		function handleClickOutside(e: MouseEvent) {
			if (favouritesRef && !favouritesRef.contains(e.target as Node)) {
				favouritesFilterOpen = false;
			}
		}
		document.addEventListener('click', handleClickOutside);
		return () => document.removeEventListener('click', handleClickOutside);
	});

	function debouncedUpdateSearch(value: string) {
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			filterStore.update((prev) => ({ ...prev, searchQuery: value }));
			debounceTimer = null;
		}, SEARCH_DEBOUNCE_MS);
	}

	function toggleTag(id: number) {
		filterStore.update((prev) => {
			const next = prev.selectedTagIds.includes(id)
				? prev.selectedTagIds.filter((t) => t !== id)
				: [...prev.selectedTagIds, id];
			return { ...prev, selectedTagIds: next };
		});
	}

	function toggleFavouritesFilter() {
		filterStore.update((prev) => ({ ...prev, favouritesOnly: !prev.favouritesOnly }));
		favouritesFilterOpen = false;
	}

	function clearFilters() {
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = null;
		filterStore.set({ searchQuery: '', selectedTagIds: [], favouritesOnly: false });
		searchInputValue = '';
		filterOpen = false;
		screensFilterOpen = false;
		favouritesFilterOpen = false;
	}

	const filter = $derived($filterStore);
	const hasActiveFilters = $derived(
		filter.searchQuery.trim() !== '' || filter.selectedTagIds.length > 0 || filter.favouritesOnly
	);
	const selectedTags = $derived(tags.filter((t) => filter.selectedTagIds.includes(t.id)));

	const tagsByDimension = $derived(
		(() => {
			const q = tagSearchQuery.trim().toLowerCase();
			const filteredTags = q
				? tags.filter((t) => t.label.toLowerCase().includes(q))
				: tags;
			const map: Record<string, Tag[]> = {};
			for (const t of filteredTags) {
				if (t.dimension === 'screen') continue; // Screens have their own dropdown
				if (!map[t.dimension]) map[t.dimension] = [];
				map[t.dimension].push(t);
			}
			const order = ['ui_type', 'color', 'pattern'];
			return order.filter((d) => map[d]?.length).map((d) => ({ dimension: d, tags: map[d] }));
		})()
	);

	const screenTags = $derived(tags.filter((t) => t.dimension === 'screen'));
	const filteredScreenTags = $derived(
		(() => {
			const q = screenSearchQuery.trim().toLowerCase();
			return q ? screenTags.filter((t) => t.label.toLowerCase().includes(q)) : screenTags;
		})()
	);
	const selectedScreenCount = $derived(
		filter.selectedTagIds.filter((id) => tags.find((t) => t.id === id)?.dimension === 'screen').length
	);
	const selectedUiElementCount = $derived(
		filter.selectedTagIds.filter((id) => {
			const t = tags.find((t) => t.id === id);
			return t && (t.dimension === 'ui_type' || t.dimension === 'color');
		}).length
	);

	const showTagSearch = $derived(
		tagsByDimension.reduce((acc, d) => acc + d.tags.length, 0) >= TAG_SEARCH_THRESHOLD
	);

	function onSearchInput(e: Event) {
		const v = (e.target as HTMLInputElement).value;
		searchInputValue = v;
		debouncedUpdateSearch(v);
	}
</script>

<div class="flex flex-col gap-3">
	<div class="flex flex-wrap items-center gap-2">
		<div class="relative flex-1 min-w-[200px] max-w-sm">
			<Search
				class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
				aria-hidden="true"
			/>
			<Input
				value={searchInputValue}
				oninput={onSearchInput}
				type="search"
				placeholder="Search by name, note, screens, or UI elements..."
				class="h-9 pl-9"
				aria-label="Search screenshots by name, note, screens, or UI elements"
			/>
		</div>
		{#if screenTags.length > 0}
			<details
				bind:this={screensRef}
				bind:open={screensFilterOpen}
				class="group"
			>
				<summary
					class="flex cursor-pointer list-none items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					aria-label="Filter by screens"
				>
					<Filter class="size-4 text-muted-foreground" />
					<span>Screens</span>
					{#if selectedScreenCount > 0}
						<span
							class="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground"
						>
							{selectedScreenCount}
						</span>
					{/if}
				</summary>
				<div
					class="mt-2 max-h-64 overflow-y-auto rounded-lg border border-border bg-background p-3 shadow-md"
				>
					{#if screenTags.length >= TAG_SEARCH_THRESHOLD}
						<div class="relative mb-3">
							<Search
								class="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
								aria-hidden="true"
							/>
							<Input
								bind:value={screenSearchQuery}
								type="search"
								placeholder="Search screens..."
								class="h-8 pl-8 text-xs"
								aria-label="Search screens"
							/>
						</div>
					{/if}
					<div class="flex flex-wrap gap-2">
						{#each filteredScreenTags as tag (tag.id)}
							{@const count = tagCounts[tag.id]}
							<button
								type="button"
								class="rounded-full border px-3 py-1 text-xs font-medium transition-colors {filter.selectedTagIds.includes(tag.id)
									? 'border-primary bg-primary text-primary-foreground'
									: 'border-input bg-muted/50 hover:bg-muted'}"
								onclick={() => toggleTag(tag.id)}
							>
								{tag.label}{#if count != null}
									<span class="ml-1 opacity-70">({count})</span>
								{/if}
							</button>
						{/each}
					</div>
				</div>
			</details>
		{/if}
		<details
			bind:this={tagsRef}
			bind:open={filterOpen}
			class="group"
		>
			<summary
				class="flex cursor-pointer list-none items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				aria-label="Filter by UI elements"
			>
				<Filter class="size-4 text-muted-foreground" />
				<span>UI Elements</span>
				{#if selectedUiElementCount > 0}
					<span
						class="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground"
					>
						{selectedUiElementCount}
					</span>
				{/if}
			</summary>
			<div
				class="mt-2 max-h-64 overflow-y-auto rounded-lg border border-border bg-background p-3 shadow-md"
			>
				{#if showTagSearch}
					<div class="relative mb-3">
						<Search
							class="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
							aria-hidden="true"
						/>
						<Input
							bind:value={tagSearchQuery}
							type="search"
							placeholder="Search UI elements..."
							class="h-8 pl-8 text-xs"
							aria-label="Search UI elements"
						/>
					</div>
				{/if}
				{#each tagsByDimension as { dimension, tags: dimTags }}
					<div class="mb-3 last:mb-0">
						<p class="mb-1.5 text-xs font-medium text-muted-foreground">
							{DIMENSION_LABELS[dimension] ?? dimension}
						</p>
						<div class="flex flex-wrap gap-2">
							{#each dimTags as tag (tag.id)}
								{@const count = tagCounts[tag.id]}
								<button
									type="button"
									class="rounded-full border px-3 py-1 text-xs font-medium transition-colors {filter.selectedTagIds.includes(tag.id)
										? 'border-primary bg-primary text-primary-foreground'
										: 'border-input bg-muted/50 hover:bg-muted'}"
									onclick={() => toggleTag(tag.id)}
								>
									{tag.label}{#if count != null}
										<span class="ml-1 opacity-70">({count})</span>
									{/if}
								</button>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</details>
		<details
			bind:this={favouritesRef}
			bind:open={favouritesFilterOpen}
			class="group"
		>
			<summary
				class="flex cursor-pointer list-none items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				aria-label="Filter by favourites"
			>
				<Heart
					class="size-4 transition-colors {filter.favouritesOnly ? 'fill-rose-500 text-rose-500' : 'text-muted-foreground'}"
				/>
				<span>Favourites</span>
				{#if filter.favouritesOnly}
					<span
						class="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground"
					>
						On
					</span>
				{/if}
			</summary>
			<div
				class="mt-2 rounded-lg border border-border bg-background p-3 shadow-md"
			>
				<button
					type="button"
					class="w-full rounded-md border px-3 py-2 text-sm font-medium transition-colors {filter.favouritesOnly
						? 'border-primary bg-primary text-primary-foreground'
						: 'border-input bg-muted/50 hover:bg-muted'}"
					onclick={toggleFavouritesFilter}
				>
					{filter.favouritesOnly ? 'Showing favourites only' : 'Show favourites only'}
				</button>
			</div>
		</details>
		{#if hasActiveFilters}
			<Button
				variant="ghost"
				size="sm"
				class="h-9 text-muted-foreground hover:text-foreground"
				onclick={clearFilters}
			>
				<X class="size-4" />
				Clear
			</Button>
		{/if}
		<div class="flex items-center gap-2 shrink-0" role="group" aria-label="Thumbnail zoom">
			<span class="text-xs font-medium text-muted-foreground tabular-nums" aria-hidden="true">−</span>
			<input
				type="range"
				min="0"
				max="100"
				value={$thumbnailZoomStore}
				oninput={(e) => thumbnailZoomStore.set(Number((e.target as HTMLInputElement).value))}
				class="h-1 w-24 min-w-0 cursor-pointer appearance-none rounded-full bg-muted accent-primary [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-thumb]:-mt-1 [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:transition-colors [&::-webkit-slider-thumb]:hover:bg-primary/90 [&::-moz-range-thumb]:size-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary"
				aria-label="Zoom thumbnails"
			/>
			<span class="text-xs font-medium text-muted-foreground tabular-nums" aria-hidden="true">+</span>
		</div>
	</div>
	{#if selectedTags.length > 0 || filter.favouritesOnly}
		<div class="flex flex-wrap items-center gap-2">
			<span class="text-muted-foreground text-xs">Filtering by:</span>
			{#each selectedTags as tag (tag.id)}
				<span
					class="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
				>
					{tag.label}
					<button
						type="button"
						class="rounded-full hover:bg-primary/20"
						onclick={() => toggleTag(tag.id)}
						aria-label="Remove {tag.label} filter"
					>
						<X class="size-3" />
					</button>
				</span>
			{/each}
			{#if filter.favouritesOnly}
				<span
					class="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
				>
					Favourites only
					<button
						type="button"
						class="rounded-full hover:bg-primary/20"
						onclick={() => filterStore.update((p) => ({ ...p, favouritesOnly: false }))}
						aria-label="Remove favourites filter"
					>
						<X class="size-3" />
					</button>
				</span>
			{/if}
		</div>
	{/if}
</div>
