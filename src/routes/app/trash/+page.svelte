<script lang="ts">
	import { getContext } from 'svelte';
	import { Download, Trash2 } from '@lucide/svelte';
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

	async function handleDownload(e: MouseEvent, shot: { id: number; url: string; fileName: string }) {
		e.preventDefault();
		e.stopPropagation();
		const url = cloudinaryUrl(shot.url, 'detail');
		try {
			const res = await fetch(url);
			const blob = await res.blob();
			const blobUrl = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = blobUrl;
			a.download = shot.fileName || 'screenshot.png';
			a.click();
			URL.revokeObjectURL(blobUrl);
		} catch {
			window.open(url, '_blank');
		}
	}
</script>

<div class="flex flex-1 flex-col gap-6">
	{#if isEmpty}
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
					class="group relative mb-4 block w-full break-inside-avoid overflow-hidden rounded-lg border bg-muted {selected?.id === shot.id
						? 'border-2 border-primary'
						: 'border border-border'}"
				>
					<button
						type="button"
						class="block w-full text-left"
						onclick={() => selectedCtx?.setSelected(selected?.id === shot.id ? null : shot)}
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
					<Button
						variant="ghost"
						size="icon"
						class="absolute right-2 top-2 size-8 rounded-md bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/70"
						aria-label="Download screenshot"
						onclick={(e) => handleDownload(e, shot)}
					>
						<Download class="size-4" />
					</Button>
				</div>
			{/each}
		</div>
	{/if}
</div>
