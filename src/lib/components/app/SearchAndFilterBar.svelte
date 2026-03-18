<script lang="ts">
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { Search, Filter, X, Heart, ChevronDown } from '@lucide/svelte';
	import type { Writable } from 'svelte/store';
	import { getSectionForLabel } from '$lib/tags.js';

	type Tag = { id: number; dimension: string; label: string; sortOrder: number };

	const SEARCH_DEBOUNCE_MS = 200;
	const TAG_SEARCH_THRESHOLD = 6;
	const SECTION_HEADER_CLASS = 'text-xs font-medium uppercase tracking-wider text-muted-foreground';

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
	let activeFilterSection = $state<'screens' | 'ui_elements' | 'pattern' | null>(null);
	let searchInputValue = $state('');
	let tagSearchQuery = $state('');
	let screenSearchQuery = $state('');
	let screensFilterOpen = $state(false);
	let uiElementsFilterOpen = $state(false);
	let screensRef: HTMLDetailsElement;
	let uiElementsRef: HTMLDetailsElement;

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
		const viewingTags = uiElementsFilterOpen || (popoverOpen && ['ui_elements', 'pattern'].includes(activeFilterSection ?? ''));
		if (!viewingTags) tagSearchQuery = '';
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

	function toggleFavouritesFilter() {
		filterStore.update((prev) => ({ ...prev, favouritesOnly: !prev.favouritesOnly }));
	}

	function clearScreensFilter() {
		const screenIds = new Set(tags.filter((t) => t.dimension === 'screen').map((t) => t.id));
		filterStore.update((prev) => ({
			...prev,
			selectedTagIds: prev.selectedTagIds.filter((id) => !screenIds.has(id))
		}));
	}

	function clearUiElementsFilter() {
		const ids = new Set(tags.filter((t) => t.dimension === 'ui_type').map((t) => t.id));
		filterStore.update((prev) => ({
			...prev,
			selectedTagIds: prev.selectedTagIds.filter((id) => !ids.has(id))
		}));
	}

	function clearPatternFilter() {
		const ids = new Set(tags.filter((t) => t.dimension === 'pattern').map((t) => t.id));
		filterStore.update((prev) => ({
			...prev,
			selectedTagIds: prev.selectedTagIds.filter((id) => !ids.has(id))
		}));
	}

	const filter = $derived($filterStore);
	const hasActiveFilters = $derived(
		filter.searchQuery.trim() !== '' || filter.selectedTagIds.length > 0 || filter.favouritesOnly
	);
	const selectedTags = $derived(tags.filter((t) => filter.selectedTagIds.includes(t.id)));

	/** UI Elements only: Control, View, Overlay, Imagery */
	const uiElementsBySection = $derived.by(() => {
		const q = tagSearchQuery.trim().toLowerCase();
		const uiTags = tags.filter((t) => t.dimension === 'ui_type');
		const sectionMap = new Map<string, Tag[]>();
		for (const t of uiTags) {
			const section = getSectionForLabel('ui_type', t.label);
			if (section && (!q || t.label.toLowerCase().includes(q))) {
				const arr = sectionMap.get(section) ?? [];
				arr.push(t);
				sectionMap.set(section, arr);
			}
		}
		const result: { section: string; tags: Tag[] }[] = [];
		for (const section of ['Control', 'View', 'Overlay', 'Imagery']) {
			const tagsInSection = sectionMap.get(section);
			if (tagsInSection?.length) result.push({ section, tags: tagsInSection });
		}
		return result;
	});

	/** Screens: Utility, Misc, Content, etc. */
	const screensBySection = $derived.by(() => {
		const q = screenSearchQuery.trim().toLowerCase();
		const screenTags = tags.filter((t) => t.dimension === 'screen');
		const sectionMap = new Map<string, Tag[]>();
		for (const t of screenTags) {
			const section = getSectionForLabel('screen', t.label) ?? 'Other';
			if (!q || t.label.toLowerCase().includes(q)) {
				const arr = sectionMap.get(section) ?? [];
				arr.push(t);
				sectionMap.set(section, arr);
			}
		}
		const sectionOrder = [
			'Utility', 'Misc', 'Content', 'Actions', 'Data', 'User Collections', 'Communication',
			'Commerce & Finance', 'Social', 'New User Experience', 'Account Management', 'Other'
		];
		const result: { section: string; tags: Tag[] }[] = [];
		for (const section of sectionOrder) {
			const tagsInSection = sectionMap.get(section);
			if (tagsInSection?.length) result.push({ section, tags: tagsInSection });
		}
		return result;
	});

	const tagsByDimension = $derived(
		(() => {
			const map: Record<string, Tag[]> = { screen: [], ui_type: [], color: [], pattern: [] };
			for (const t of tags) {
				if (map[t.dimension]) map[t.dimension].push(t);
			}
			return map;
		})()
	);

	const screenTags = $derived(tags.filter((t) => t.dimension === 'screen'));
	const patternTags = $derived(tags.filter((t) => t.dimension === 'pattern'));

	const filteredPatternTags = $derived.by(() => {
		const q = tagSearchQuery.trim().toLowerCase();
		return q ? patternTags.filter((t) => t.label.toLowerCase().includes(q)) : patternTags;
	});

	const selectedScreenCount = $derived(
		filter.selectedTagIds.filter((id) => tags.find((t) => t.id === id)?.dimension === 'screen').length
	);
	const selectedUiElementCount = $derived(
		filter.selectedTagIds.filter((id) => tags.find((t) => t.id === id)?.dimension === 'ui_type').length
	);
	const selectedPatternCount = $derived(
		filter.selectedTagIds.filter((id) => tags.find((t) => t.id === id)?.dimension === 'pattern').length
	);

	const showUiElementsSearch = $derived(
		tagsByDimension.ui_type?.length >= TAG_SEARCH_THRESHOLD
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
									toggleFavouritesFilter();
								}}
							aria-label={filter.favouritesOnly ? 'Remove favourites filter' : 'Show favourites only'}
							aria-pressed={filter.favouritesOnly}
						>
							<Heart
								class="size-4 {filter.favouritesOnly ? 'fill-primary text-primary' : 'text-muted-foreground'}"
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
									class="flex items-center gap-2 px-3 py-2.5 text-left text-sm font-medium transition-colors {activeFilterSection === 'screens'
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
										<span class="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
											{selectedScreenCount}
										</span>
									{/if}
								</button>
							{/if}
							{#if uiElementsBySection.length > 0}
								<button
									type="button"
									class="flex items-center gap-2 px-3 py-2.5 text-left text-sm font-medium transition-colors {activeFilterSection === 'ui_elements'
										? 'bg-background text-foreground'
										: 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}"
									onclick={(e) => {
										e.stopPropagation();
										activeFilterSection = activeFilterSection === 'ui_elements' ? null : 'ui_elements';
									}}
								>
									<Filter class="size-4 shrink-0" />
									<span>UI Elements</span>
									{#if selectedUiElementCount > 0}
										<span class="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
											{selectedUiElementCount}
										</span>
									{/if}
								</button>
							{/if}
							{#if patternTags.length > 0}
								<button
									type="button"
									class="flex items-center gap-2 px-3 py-2.5 text-left text-sm font-medium transition-colors {activeFilterSection === 'pattern'
										? 'bg-background text-foreground'
										: 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}"
									onclick={(e) => {
										e.stopPropagation();
										activeFilterSection = activeFilterSection === 'pattern' ? null : 'pattern';
									}}
								>
									<Filter class="size-4 shrink-0" />
									<span>Pattern</span>
									{#if selectedPatternCount > 0}
										<span class="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
											{selectedPatternCount}
										</span>
									{/if}
								</button>
							{/if}
						</nav>
						<div class="min-w-0 flex-1 overflow-y-auto p-3">
							{#if activeFilterSection === 'screens'}
								<div class="space-y-4">
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
									{#each screensBySection as { section, tags: sectionTags }}
										<div class="space-y-2">
											<p class={SECTION_HEADER_CLASS}>{section}</p>
											<div class="flex flex-wrap gap-2">
												{#each sectionTags as tag (tag.id)}
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
							{:else if activeFilterSection === 'ui_elements'}
								<div class="space-y-4">
									{#if showUiElementsSearch}
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
									{#each uiElementsBySection as { section, tags: sectionTags }}
										<div class="space-y-2">
											<p class={SECTION_HEADER_CLASS}>{section}</p>
											<div class="flex flex-wrap gap-2">
												{#each sectionTags as tag (tag.id)}
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
							{:else if activeFilterSection === 'pattern'}
								<div class="space-y-4">
									{#if patternTags.length >= TAG_SEARCH_THRESHOLD}
										<div class="relative">
											<Search
												class="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
												aria-hidden="true"
											/>
											<Input
												bind:value={tagSearchQuery}
												type="search"
												placeholder="Search patterns..."
												class="h-8 pl-8 text-xs"
												aria-label="Search patterns"
												onclick={(e) => e.stopPropagation()}
											/>
										</div>
									{/if}
									<p class={SECTION_HEADER_CLASS}>Pattern</p>
									<div class="flex flex-wrap gap-2">
										{#each filteredPatternTags as tag (tag.id)}
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
							{:else}
								<p class="text-sm text-muted-foreground">
									Select a filter to refine your search.
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
					<div class="space-y-4">
						{#each screensBySection as { section, tags: sectionTags }}
							<div class="space-y-2">
								<p class={SECTION_HEADER_CLASS}>{section}</p>
								<div class="flex flex-wrap gap-2">
									{#each sectionTags as tag (tag.id)}
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
				aria-label="Filter by UI elements and pattern"
			>
				<Filter class="size-4 text-muted-foreground" />
				<span>UI Elements</span>
				{#if selectedUiElementCount + selectedPatternCount > 0}
					<button
						type="button"
						class="group/badge flex items-center justify-center rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground hover:bg-primary/90 min-w-[1.5rem]"
						onclick={(e) => {
							e.stopPropagation();
							clearUiElementsFilter();
							clearPatternFilter();
						}}
						aria-label="Clear UI elements filter"
					>
						<span class="group-hover/badge:hidden">{selectedUiElementCount + selectedPatternCount}</span>
						<X class="size-3 hidden group-hover/badge:inline-block" aria-hidden="true" />
					</button>
				{:else}
					<ChevronDown class="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
				{/if}
			</summary>
			<div
				class="absolute left-0 top-full z-50 mt-2 max-h-64 min-w-[280px] overflow-y-auto rounded-2xl border border-border bg-background p-3 shadow-lg"
			>
				{#if showUiElementsSearch || patternTags.length >= TAG_SEARCH_THRESHOLD}
					<div class="relative mb-3">
						<Search
							class="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
							aria-hidden="true"
						/>
						<Input
							bind:value={tagSearchQuery}
							type="search"
							placeholder="Search UI elements, patterns..."
							class="h-8 pl-8 text-xs"
							aria-label="Search tags"
						/>
					</div>
				{/if}
				{#if uiElementsBySection.length > 0}
					<div class="mb-4 space-y-2">
						<p class={SECTION_HEADER_CLASS}>UI Elements</p>
						{#each uiElementsBySection as { section, tags: sectionTags }}
							<div class="space-y-2">
								<span class="block text-xs font-medium text-muted-foreground/90">{section}</span>
								<div class="flex flex-wrap gap-2">
									{#each sectionTags as tag (tag.id)}
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
				{/if}
				{#if patternTags.length > 0}
					<div class="space-y-2">
						<p class={SECTION_HEADER_CLASS}>Pattern</p>
						<div class="flex flex-wrap gap-2">
							{#each filteredPatternTags as tag (tag.id)}
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
				{/if}
			</div>
		</details>
		<button
			type="button"
			class="flex items-center gap-2 rounded-full border px-4 py-3 text-sm font-medium transition-colors {filter.favouritesOnly
				? 'border-primary bg-primary/10 text-primary'
				: 'border-input bg-background hover:bg-muted/50'}"
			onclick={toggleFavouritesFilter}
			aria-label={filter.favouritesOnly ? 'Remove favourites filter' : 'Show favourites only'}
			aria-pressed={filter.favouritesOnly}
		>
			<Heart
				class="size-4 transition-colors {filter.favouritesOnly ? 'fill-primary text-primary' : 'text-muted-foreground'}"
			/>
			<span>Favourites</span>
		</button>
	</div>
</div>
