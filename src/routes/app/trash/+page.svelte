<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { getContext } from 'svelte';
	import { RotateCcw, Trash2, X } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { cloudinaryUrl } from '$lib/cloudinary.js';
	import { filterScreenshots } from '$lib/filter-screenshots.js';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type Screenshot = {
		id: number;
		url: string;
		fileName: string;
		note?: string | null;
		createdAt: Date | string;
		deletedAt: Date | string | null;
		tags?: { id: number }[];
	};
	const selectedCtx = getContext<{
		selected: Screenshot | null;
		setSelected: (s: Screenshot | null) => void;
	}>('selectedScreenshot');
	const filterStore = getContext<{ subscribe: (fn: (v: { searchQuery: string; selectedTagIds: number[]; selectedRating: number | null }) => void) => () => void }>('screenshotFilters');

	const rawScreenshots = $derived(data.screenshots ?? []);
	let filterState = $state<{ searchQuery: string; selectedTagIds: number[]; selectedRating: number | null }>({
		searchQuery: '',
		selectedTagIds: [],
		selectedRating: null
	});
	$effect(() => {
		if (!filterStore) return;
		return filterStore.subscribe((v) => {
			filterState = v;
		});
	});
	const screenshots = $derived(
		filterScreenshots(rawScreenshots, filterState.searchQuery, filterState.selectedTagIds, filterState.selectedRating)
	);
	const isEmpty = $derived(screenshots.length === 0);
	const selected = $derived(selectedCtx?.selected ?? null);
</script>

<div class="flex flex-1 flex-col gap-6">
	{#if selected}
		<div class="relative flex flex-1 flex-col items-center justify-center">
			<Button
				variant="ghost"
				size="icon"
				class="absolute right-0 top-0 z-10"
				onclick={() => selectedCtx?.setSelected(null)}
				aria-label="Close preview"
			>
				<X class="size-4" />
			</Button>
			<img
				src={cloudinaryUrl(selected.url, 'detail')}
				alt={selected.fileName}
				class="max-h-[calc(100vh-12rem)] max-w-full rounded-lg object-contain shadow-lg"
			/>
		</div>
	{:else if isEmpty}
		<div
			class="flex flex-1 flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-muted-foreground/25 py-16"
		>
			<Trash2 class="size-12 text-muted-foreground" aria-hidden="true" />
			<div class="text-center space-y-1">
				<p class="text-sm font-medium">Trash is empty</p>
				<p class="text-muted-foreground text-xs">
					Deleted screenshots will appear here. You can restore them before permanent removal.
				</p>
			</div>
		</div>
	{:else}
		<div class="columns-2 gap-4 sm:columns-3 md:columns-4 lg:columns-5">
			{#each screenshots as shot (shot.id)}
				<div
					class="group relative mb-4 block w-full break-inside-avoid overflow-hidden rounded-lg border border-border bg-muted"
				>
					<button
						type="button"
						class="block w-full text-left"
						onclick={() => selectedCtx?.setSelected(shot)}
					>
						<img
							src={cloudinaryUrl(shot.url, 'thumbnail')}
							alt={shot.fileName}
							class="w-full object-cover transition-transform group-hover:scale-105"
						/>
						<div
							class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100"
						>
							<p class="truncate text-xs text-white">{shot.fileName}</p>
						</div>
					</button>
					<div class="flex gap-1 p-2">
						<form
							method="post"
							action="?/restore"
							use:enhance={() => async ({ result }) => {
								if (result.type === 'success') await invalidateAll();
							}}
						>
							<input type="hidden" name="id" value={shot.id} />
							<Button type="submit" variant="ghost" size="sm" class="h-8 px-2">
								<RotateCcw class="size-3.5" />
								Restore
							</Button>
						</form>
						<form
							method="post"
							action="?/permanentDelete"
							use:enhance={() => async ({ result }) => {
								if (result.type === 'success') {
									selectedCtx?.setSelected(null);
									await invalidateAll();
								}
							}}
						>
							<input type="hidden" name="id" value={shot.id} />
							<Button type="submit" variant="ghost" size="sm" class="h-8 px-2 text-destructive hover:text-destructive">
								<Trash2 class="size-3.5" />
								Delete
							</Button>
						</form>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
