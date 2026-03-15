<script lang="ts">
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Search, Filter, X, Star } from '@lucide/svelte';
	import type { Writable } from 'svelte/store';

	type Tag = { id: number; dimension: string; label: string; sortOrder: number };

	const RATING_MAX = 5;

	let {
		tags = [],
		filterStore
	}: {
		tags?: Tag[];
		filterStore: Writable<{ searchQuery: string; selectedTagIds: number[]; selectedRating: number | null }>;
	} = $props();

	let filterOpen = $state(false);
	let ratingFilterOpen = $state(false);

	function toggleTag(id: number) {
		filterStore.update((prev) => {
			const next = prev.selectedTagIds.includes(id)
				? prev.selectedTagIds.filter((t) => t !== id)
				: [...prev.selectedTagIds, id];
			return { ...prev, selectedTagIds: next };
		});
	}

	function setRatingFilter(rating: number | null) {
		filterStore.update((prev) => ({ ...prev, selectedRating: rating }));
		ratingFilterOpen = false;
	}

	function clearFilters() {
		filterStore.set({ searchQuery: '', selectedTagIds: [], selectedRating: null });
		filterOpen = false;
		ratingFilterOpen = false;
	}

	const filter = $derived($filterStore);
	const hasActiveFilters = $derived(
		filter.searchQuery.trim() !== '' || filter.selectedTagIds.length > 0 || filter.selectedRating != null
	);
	const selectedTags = $derived(tags.filter((t) => filter.selectedTagIds.includes(t.id)));

	function onSearchInput(e: Event) {
		const v = (e.target as HTMLInputElement).value;
		filterStore.update((prev) => ({ ...prev, searchQuery: v }));
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
				value={filter.searchQuery}
				oninput={onSearchInput}
				type="search"
				placeholder="Search by name..."
				class="h-9 pl-9"
				aria-label="Search screenshots by name"
			/>
		</div>
		<details
			bind:open={filterOpen}
			class="group"
		>
			<summary
				class="flex cursor-pointer list-none items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				aria-label="Filter by tags"
			>
				<Filter class="size-4 text-muted-foreground" />
				<span>Tags</span>
				{#if filter.selectedTagIds.length > 0}
					<span
						class="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground"
					>
						{filter.selectedTagIds.length}
					</span>
				{/if}
			</summary>
			<div
				class="mt-2 max-h-48 overflow-y-auto rounded-lg border border-border bg-background p-3 shadow-md"
			>
				<div class="flex flex-wrap gap-2">
					{#each tags as tag (tag.id)}
						<button
							type="button"
							class="rounded-full border px-3 py-1 text-xs font-medium transition-colors {filter.selectedTagIds.includes(tag.id)
								? 'border-primary bg-primary text-primary-foreground'
								: 'border-input bg-muted/50 hover:bg-muted'}"
							onclick={() => toggleTag(tag.id)}
						>
							{tag.label}
						</button>
					{/each}
				</div>
			</div>
		</details>
		<details
			bind:open={ratingFilterOpen}
			class="group"
		>
			<summary
				class="flex cursor-pointer list-none items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				aria-label="Filter by rating"
			>
				<Star class="size-4 text-muted-foreground" />
				<span>Rating</span>
				{#if filter.selectedRating != null}
					<span
						class="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground"
					>
						{filter.selectedRating}★
					</span>
				{/if}
			</summary>
			<div
				class="mt-2 rounded-lg border border-border bg-background p-3 shadow-md"
			>
				<div class="flex flex-wrap gap-2">
					<button
						type="button"
						class="rounded-full border px-3 py-1 text-xs font-medium transition-colors {filter.selectedRating === null
							? 'border-primary bg-primary text-primary-foreground'
							: 'border-input bg-muted/50 hover:bg-muted'}"
						onclick={() => setRatingFilter(null)}
					>
						All
					</button>
					{#each Array(RATING_MAX) as _, i}
						{@const value = i + 1}
						<button
							type="button"
							class="rounded-full border px-3 py-1 text-xs font-medium transition-colors {filter.selectedRating === value
								? 'border-primary bg-primary text-primary-foreground'
								: 'border-input bg-muted/50 hover:bg-muted'}"
							onclick={() => setRatingFilter(value)}
						>
							{value}★
						</button>
					{/each}
				</div>
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
	</div>
	{#if selectedTags.length > 0 || filter.selectedRating != null}
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
			{#if filter.selectedRating != null}
				<span
					class="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
				>
					{filter.selectedRating}★
					<button
						type="button"
						class="rounded-full hover:bg-primary/20"
						onclick={() => setRatingFilter(null)}
						aria-label="Remove rating filter"
					>
						<X class="size-3" />
					</button>
				</span>
			{/if}
		</div>
	{/if}
</div>
