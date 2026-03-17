<script lang="ts">
	import { getContext } from 'svelte';
	import { Download, Heart } from '@lucide/svelte';
	import { SCREENSHOT_DRAG_TYPE, type ScreenshotDragData } from '$lib/move-screenshot.js';
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
		tags?: { id: number }[];
	};
	const selectedCtx = getContext<{
		selected: Screenshot | null;
		setSelected: (s: Screenshot | null) => void;
	}>('selectedScreenshot');
	const fullscreenCtx = getContext<{ setFullscreen: (s: Screenshot | null) => void }>('fullscreenScreenshot');
	const filterStore = getContext<{ subscribe: (fn: (v: { searchQuery: string; selectedTagIds: number[]; favouritesOnly: boolean }) => void) => () => void }>('screenshotFilters');

	let filterState = $state<{ searchQuery: string; selectedTagIds: number[]; favouritesOnly: boolean }>({
		searchQuery: '',
		selectedTagIds: [],
		favouritesOnly: false
	});
	$effect(() => {
		if (!filterStore) return;
		return filterStore.subscribe((v) => {
			filterState = v;
		});
	});

	const rawScreenshots = $derived(data.screenshots ?? []);
	const screenshots = $derived(
		filterScreenshots(rawScreenshots, filterState.searchQuery, filterState.selectedTagIds, false)
	);
	const isEmpty = $derived(screenshots.length === 0);
	const selected = $derived(selectedCtx?.selected ?? null);

	function handleScreenshotDragStart(e: DragEvent, shot: { id: number; tags?: { id: number }[] }) {
		if (!e.dataTransfer) return;
		const data: ScreenshotDragData = {
			screenshotId: shot.id,
			tagIds: (shot.tags ?? []).map((t) => t.id)
		};
		e.dataTransfer.setData(SCREENSHOT_DRAG_TYPE, JSON.stringify(data));
		e.dataTransfer.effectAllowed = 'move';
	}

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
	<h1 class="text-2xl font-semibold tracking-tight">Favourites</h1>
	{#if isEmpty}
		<div class="flex flex-1 flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border bg-muted/30 py-16 text-center">
			<Heart class="size-12 text-muted-foreground/50" aria-hidden="true" />
			<p class="text-muted-foreground text-sm">No favourited screenshots</p>
			<p class="text-muted-foreground/80 text-xs max-w-sm">
				Click the heart on any screenshot in All or a folder to add it here.
			</p>
		</div>
	{:else}
		<div class="columns-2 gap-4 sm:columns-3 md:columns-4 lg:columns-5">
			{#each screenshots as shot (shot.id)}
				<div
					role="listitem"
					class="group relative mb-4 block w-full break-inside-avoid overflow-hidden rounded-lg border bg-muted shadow-sm transition-shadow hover:shadow-md cursor-grab active:cursor-grabbing {selected?.id === shot.id
						? 'border-2 border-primary'
						: 'border border-border'}"
					draggable="true"
					ondragstart={(e) => handleScreenshotDragStart(e, shot)}
				>
					<button
						type="button"
						class="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
						onclick={() => selectedCtx?.setSelected(selected?.id === shot.id ? null : shot)}
						ondblclick={(e) => {
							e.preventDefault();
							selectedCtx?.setSelected(shot);
							fullscreenCtx?.setFullscreen(shot);
						}}
					>
						<img
							src={cloudinaryUrl(shot.url, 'thumbnail')}
							alt={shot.fileName}
							class="w-full object-contain transition-transform group-hover:scale-105 bg-muted/50"
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
