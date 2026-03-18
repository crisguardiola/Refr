<script lang="ts">
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { Search, Filter, X, Heart, ChevronDown } from '@lucide/svelte';
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
		filterStore
	}: {
		tags?: Tag[];
		tagCounts?: Record<number, number>;
		filterStore: Writable<{ searchQuery: string; selectedTagIds: number[]; favouritesOnly: boolean }>;
	} = $props();

	let popoverOpen = $state(false);
	let activeFilterSection = $state<'screens' | 'ui_elements' | null>(null);
	let searchInputValue = $state('');
	let tagSearchQuery = $state('');
	let screenSearchQuery = $state('');
	let screensFilterOpen = $state(false);
	let uiElementsFilterOpen = $state(false);
	let favouritesFilterOpen = $state(false);
	let screensRef: HTMLDetailsElement;
	let uiElementsRef: HTMLDetailsElement;
	let favouritesRef: HTMLDetailsElement;

	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	$effect(() => {
		searchInputValue = $filterStore.searchQuery;
	});

	$effect(() => {
		if (!popoverOpen) {
			tagSearchQuery = '';
			screenSearchQuery = '';
		}
	});

	$effect(() => {
		const viewingScreens = screensFilterOpen || (popoverOpen && activeFilterSection === 'screens');
		if (!viewingScreens) screenSearchQuery = '';
	});
	$effect(() => {
		const viewingUiElements = uiElementsFilterOpen || (popoverOpen && activeFilterSection === 'ui_elements');
		if (!viewingUiElements) tagSearchQuery = '';
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
		if (!uiElementsFilterOpen) return;
		function handleClickOutside(e: MouseEvent) {
			if (uiElementsRef && !uiElementsRef.contains(e.target as Node)) {
				uiElementsFilterOpen = false;
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

	function toggleTag(id: number, closePopover = false) {
		filterStore.update((prev) => {
			const next = prev.selectedTagIds.includes(id)
				? prev.selectedTagIds.filter((t) => t !== id)
				: [...prev.selectedTagIds, id];
			return { ...prev, selectedTagIds: next };
		});
		if (closePopover) popoverOpen = false;
	}

	/** Popover: single-select per dimension, then close */
	function selectTagInPopover(id: number) {
		const tag = tags.find((t) => t.id === id);
		if (!tag) return;
		const idsInDimension = new Set(
			tags.filter((t) => t.dimension === tag.dimension).map((t) => t.id)
		);
		filterStore.update((prev) => {
			const isSelected = prev.selectedTagIds.includes(id);
			if (isSelected) {
				return { ...prev, selectedTagIds: prev.selectedTagIds.filter((t) => t !== id) };
			}
			const next = [
				...prev.selectedTagIds.filter((t) => !idsInDimension.has(t)),
				id
			];
			return { ...prev, selectedTagIds: next };
		});
		popoverOpen = false;
	}

	function toggleFavouritesFilter(closePopover = false) {
		filterStore.update((prev) => ({ ...prev, favouritesOnly: !prev.favouritesOnly }));
		favouritesFilterOpen = false;
		if (closePopover) popoverOpen = false;
	}

	function clearScreensFilter() {
		const screenIds = new Set(tags.filter((t) => t.dimension === 'screen').map((t) => t.id));
		filterStore.update((prev) => ({
			...prev,
			selectedTagIds: prev.selectedTagIds.filter((id) => !screenIds.has(id))
		}));
	}

	function clearUiElementsFilter() {
		const uiIds = new Set(
			tags.filter((t) => ['ui_type', 'color', 'pattern'].includes(t.dimension)).map((t) => t.id)
		);
		filterStore.update((prev) => ({
			...prev,
			selectedTagIds: prev.selectedTagIds.filter((id) => !uiIds.has(id))
		}));
	}

	function clearFavouritesFilter() {
		filterStore.update((prev) => ({ ...prev, favouritesOnly: false }));
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
				if (t.dimension === 'screen') continue;
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
			return t && (t.dimension === 'ui_type' || t.dimension === 'color' || t.dimension === 'pattern');
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
	<div class="flex items-center gap-2">
		<Popover.Root bind:open={popoverOpen}>
			<Popover.Trigger
				class="relative flex flex-1 min-w-[200px] max-w-sm cursor-pointer list-none appearance-none rounded-full border border-input bg-background px-4 py-3 text-left text-sm hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-search-cancel-button]:hidden"
				aria-label="Search and filter screenshots"
			>
				<Search
					class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
					aria-hidden="true"
				/>
				<span
					class="block truncate pl-9 {hasActiveFilters ? 'text-foreground' : 'text-muted-foreground'}"
				>
					{#if hasActiveFilters}
						{filter.searchQuery || 'Filters active'}
						{#if selectedTags.length > 0 || filter.favouritesOnly}
							<span class="ml-1 text-xs opacity-70">
								({selectedTags.length + (filter.favouritesOnly ? 1 : 0)})
							</span>
						{/if}
					{:else}
						Search by name, note, screens, or UI elements...
					{/if}
				</span>
			</Popover.Trigger>
			<Popover.Portal>
				<Popover.Content
					align="start"
					side="bottom"
					class="w-[min(90vw,480px)] rounded-2xl p-0"
					onclick={(e) => e.stopPropagation()}
				>
					<!-- Header: search + favourites chip -->
					<div class="flex items-center gap-2 border-b border-border p-3">
						<div class="relative flex-1 min-w-0">
							<Search
								class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
								aria-hidden="true"
							/>
							<Input
								value={searchInputValue}
								oninput={onSearchInput}
								type="search"
								placeholder="Search by name, note, screens, or UI elements..."
								class="h-10 rounded-full pl-9"
								aria-label="Search screenshots"
								onclick={(e) => e.stopPropagation()}
							/>
						</div>
						<button
							type="button"
							class="flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-3 text-sm font-medium transition-colors {filter.favouritesOnly
								? 'border-primary bg-primary/10 text-primary'
								: 'border-input bg-muted/50 hover:bg-muted'}"
						onclick={(e) => {
									e.stopPropagation();
									toggleFavouritesFilter(true);
								}}
							aria-label={filter.favouritesOnly ? 'Remove favourites filter' : 'Show favourites only'}
							aria-pressed={filter.favouritesOnly}
						>
							<Heart
								class="size-4 {filter.favouritesOnly ? 'fill-rose-500 text-rose-500' : 'text-muted-foreground'}"
							/>
							<span class="hidden sm:inline">Favourites</span>
						</button>
					</div>

					<!-- Body: side menu + detail panel -->
					<div class="flex min-h-[200px] max-h-[320px]">
						<nav
							class="flex w-36 shrink-0 flex-col border-e border-border bg-muted/30"
							aria-label="Filter categories"
						>
							{#if screenTags.length > 0}
								<button
									type="button"
									class="flex items-center gap-2 px-3 py-2.5 text-left text-sm font-medium transition-colors {activeFilterSection ===
									'screens'
										? 'bg-background text-foreground'
										: 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}"
									onclick={(e) => {
										e.stopPropagation();
										activeFilterSection = activeFilterSection === 'screens' ? null : 'screens';
									}}
								>
									<Filter class="size-4 shrink-0" />
									<span>Screens</span>
									{#if selectedScreenCount > 0}
										<span
											class="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground"
										>
											{selectedScreenCount}
										</span>
									{/if}
								</button>
							{/if}
							<button
								type="button"
								class="flex items-center gap-2 px-3 py-2.5 text-left text-sm font-medium transition-colors {activeFilterSection ===
								'ui_elements'
									? 'bg-background text-foreground'
									: 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}"
								onclick={(e) => {
									e.stopPropagation();
									activeFilterSection =
										activeFilterSection === 'ui_elements' ? null : 'ui_elements';
								}}
							>
								<Filter class="size-4 shrink-0" />
								<span>UI Elements</span>
								{#if selectedUiElementCount > 0}
									<span
										class="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground"
									>
										{selectedUiElementCount}
									</span>
								{/if}
							</button>
						</nav>
						<div class="min-w-0 flex-1 overflow-y-auto p-3">
							{#if activeFilterSection === 'screens'}
								<div class="space-y-3">
									{#if screenTags.length >= TAG_SEARCH_THRESHOLD}
										<div class="relative">
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
												onclick={(e) => e.stopPropagation()}
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
												onclick={(e) => {
													e.stopPropagation();
													selectTagInPopover(tag.id);
												}}
											>
												{tag.label}{#if count != null}
													<span class="ml-1 opacity-70">({count})</span>
												{/if}
											</button>
										{/each}
									</div>
								</div>
							{:else if activeFilterSection === 'ui_elements'}
								<div class="space-y-3">
									{#if showTagSearch}
										<div class="relative">
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
												onclick={(e) => e.stopPropagation()}
											/>
										</div>
									{/if}
									{#each tagsByDimension as { dimension, tags: dimTags }}
										<div>
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
														onclick={(e) => {
															e.stopPropagation();
															selectTagInPopover(tag.id);
														}}
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
							{:else}
								<p class="text-sm text-muted-foreground">
									Select Screens or UI Elements to filter by category.
								</p>
							{/if}
						</div>
					</div>
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
		{#if screenTags.length > 0}
			<details
				bind:this={screensRef}
				bind:open={screensFilterOpen}
				class="group relative"
			>
				<summary
					class="flex cursor-pointer list-none items-center gap-2 rounded-full border border-input bg-background px-4 py-3 text-sm font-medium hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					aria-label="Filter by screens"
				>
					<Filter class="size-4 text-muted-foreground" />
					<span>Screens</span>
					{#if selectedScreenCount > 0}
						<button
							type="button"
							class="group/badge flex items-center justify-center rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground hover:bg-primary/90 min-w-[1.5rem]"
							onclick={(e) => {
								e.stopPropagation();
								clearScreensFilter();
							}}
							aria-label="Clear screens filter"
						>
							<span class="group-hover/badge:hidden">{selectedScreenCount}</span>
							<X class="size-3 hidden group-hover/badge:inline-block" aria-hidden="true" />
						</button>
					{:else}
						<ChevronDown class="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
					{/if}
				</summary>
				<div
					class="absolute left-0 top-full z-50 mt-2 max-h-64 min-w-[280px] overflow-y-auto rounded-2xl border border-border bg-background p-3 shadow-lg"
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
			bind:this={uiElementsRef}
			bind:open={uiElementsFilterOpen}
			class="group relative"
		>
			<summary
				class="flex cursor-pointer list-none items-center gap-2 rounded-full border border-input bg-background px-4 py-3 text-sm font-medium hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			aria-label="Filter by UI elements"
			>
				<Filter class="size-4 text-muted-foreground" />
				<span>UI Elements</span>
				{#if selectedUiElementCount > 0}
					<button
						type="button"
						class="group/badge flex items-center justify-center rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground hover:bg-primary/90 min-w-[1.5rem]"
						onclick={(e) => {
							e.stopPropagation();
							clearUiElementsFilter();
						}}
						aria-label="Clear UI elements filter"
					>
						<span class="group-hover/badge:hidden">{selectedUiElementCount}</span>
						<X class="size-3 hidden group-hover/badge:inline-block" aria-hidden="true" />
					</button>
				{:else}
					<ChevronDown class="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
				{/if}
			</summary>
			<div
				class="absolute left-0 top-full z-50 mt-2 max-h-64 min-w-[280px] overflow-y-auto rounded-2xl border border-border bg-background p-3 shadow-lg"
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
			class="group relative"
		>
			<summary
				class="flex cursor-pointer list-none items-center gap-2 rounded-full border border-input bg-background px-4 py-3 text-sm font-medium hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			aria-label="Filter by favourites"
			>
				<Heart
					class="size-4 transition-colors {filter.favouritesOnly ? 'fill-rose-500 text-rose-500' : 'text-muted-foreground'}"
				/>
				<span>Favourites</span>
				{#if filter.favouritesOnly}
					<button
						type="button"
						class="group/badge flex items-center justify-center rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground hover:bg-primary/90 min-w-[1.5rem]"
						onclick={(e) => {
							e.stopPropagation();
							clearFavouritesFilter();
						}}
						aria-label="Clear favourites filter"
					>
						<span class="group-hover/badge:hidden">On</span>
						<X class="size-3 hidden group-hover/badge:inline-block" aria-hidden="true" />
					</button>
				{:else}
					<ChevronDown class="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
				{/if}
			</summary>
			<div
				class="absolute left-0 top-full z-50 mt-2 min-w-[200px] rounded-2xl border border-border bg-background p-3 shadow-lg"
			>
				<button
					type="button"
					class="w-full rounded-full border px-4 py-3 text-sm font-medium transition-colors {filter.favouritesOnly
						? 'border-primary bg-primary text-primary-foreground'
						: 'border-input bg-muted/50 hover:bg-muted'}"
					onclick={toggleFavouritesFilter}
				>
					{filter.favouritesOnly ? 'Showing favourites only' : 'Show favourites only'}
				</button>
			</div>
		</details>
	</div>
</div>
