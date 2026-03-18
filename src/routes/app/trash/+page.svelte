<script lang="ts">
	import { getContext } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { Download, Heart, Maximize2, MoreVertical, Trash2 } from '@lucide/svelte';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { cloudinaryUrl } from '$lib/cloudinary.js';
	import { filterScreenshots } from '$lib/filter-screenshots.js';
	import { groupScreenshotsByMonth } from '$lib/group-screenshots-by-month.js';
	import { getColumnWidthPx } from '$lib/thumbnail-zoom.js';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type Screenshot = {
		id: number;
		url: string;
		fileName: string;
		note?: string | null;
		favourite?: boolean;
		createdAt: Date | string;
		deletedAt: Date | string | null;
		folder?: { id: number; name: string } | null;
		tags?: { id: number }[];
	};
	const selectedCtx = getContext<{
		selected: Screenshot | null;
		setSelected: (s: Screenshot | null) => void;
	}>('selectedScreenshot');
	const fullscreenCtx = getContext<{ setFullscreen: (s: Screenshot | null) => void }>('fullscreenScreenshot');
	const currentScreenshotsStore = getContext<import('svelte/store').Writable<Screenshot[]>>('currentScreenshots');
	$effect(() => {
		currentScreenshotsStore?.set(data.screenshots ?? []);
	});
	const filterStore = getContext<{ subscribe: (fn: (v: { searchQuery: string; selectedTagIds: number[]; favouritesOnly: boolean }) => void) => () => void }>('screenshotFilters');
	const zoomStore = getContext<import('svelte/store').Writable<number>>('thumbnailZoom');

	const rawScreenshots = $derived(data.screenshots ?? []);
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
	const screenshots = $derived(
		filterScreenshots(rawScreenshots, filterState.searchQuery, filterState.selectedTagIds, filterState.favouritesOnly)
	);
	const screenshotsByMonth = $derived(groupScreenshotsByMonth(screenshots));
	const isEmpty = $derived(screenshots.length === 0);
	const selected = $derived(selectedCtx?.selected ?? null);
	let zoomLevel = $state(50);
	$effect(() => {
		if (!zoomStore) return;
		return zoomStore.subscribe((v) => {
			zoomLevel = v;
		});
	});
	let menuOpenForId = $state<number | null>(null);

	async function handleDownload(e: MouseEvent, shot: { id: number; url: string; fileName: string }) {
		e.preventDefault();
		e.stopPropagation();
		menuOpenForId = null;
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

	function handleOpenImage(e: MouseEvent, shot: Screenshot) {
		e.preventDefault();
		e.stopPropagation();
		menuOpenForId = null;
		fullscreenCtx?.setFullscreen(shot);
	}

	async function handlePermanentDelete(e: MouseEvent, shot: { id: number }) {
		e.preventDefault();
		e.stopPropagation();
		if (!confirm('Permanently delete this screenshot? This cannot be undone.')) return;
		menuOpenForId = null;
		const formData = new FormData();
		formData.append('id', String(shot.id));
		try {
			const res = await fetch('/app/trash?/permanentDelete', { method: 'POST', body: formData });
			const json = await res.json();
			if (json?.success) {
				selectedCtx?.setSelected(null);
				await invalidateAll();
			}
		} catch (err) {
			console.error('Permanent delete failed:', err);
		}
	}

	async function handleFavouriteToggle(
		e: MouseEvent,
		shot: { id: number; favourite?: boolean; folder?: { id: number } | null; tags?: { id: number }[] }
	) {
		e.preventDefault();
		e.stopPropagation();
		const next = !shot.favourite;
		const formData = new FormData();
		formData.append('id', String(shot.id));
		formData.append('favourite', next ? '1' : '0');
		formData.append('folderId', shot.folder?.id != null ? String(shot.folder.id) : '');
		formData.append('tags', (shot.tags ?? []).map((t) => t.id).join(','));
		try {
			const res = await fetch('/app/screenshot/update', { method: 'POST', body: formData });
			const json = await res.json();
			if (json?.success) {
				if (selected?.id === shot.id) {
					selectedCtx?.setSelected({ ...shot, favourite: next } as Screenshot);
				}
				await invalidateAll();
			}
		} catch (err) {
			console.error('Favourite toggle failed:', err);
		}
	}
</script>

<div class="flex flex-1 flex-col gap-6">
	<div class="sticky top-0 z-10 flex items-center justify-between gap-4 bg-background/95 backdrop-blur-xl pb-4 -mt-4 pt-4">
		<h1 class="text-2xl font-semibold tracking-tight">Trash</h1>
		<div class="flex items-center gap-2 shrink-0" role="group" aria-label="Thumbnail zoom">
			<span class="text-xs font-medium text-muted-foreground tabular-nums" aria-hidden="true">−</span>
			<input
				type="range"
				min="0"
				max="100"
				value={$zoomStore}
				oninput={(e) => zoomStore.set(Number((e.target as HTMLInputElement).value))}
				class="h-1 w-24 min-w-0 cursor-pointer appearance-none rounded-full bg-muted accent-primary [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-thumb]:-mt-1 [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:transition-colors [&::-webkit-slider-thumb]:hover:bg-primary/90 [&::-moz-range-thumb]:size-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary"
				aria-label="Zoom thumbnails"
			/>
			<span class="text-xs font-medium text-muted-foreground tabular-nums" aria-hidden="true">+</span>
		</div>
	</div>
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
		<div class="flex flex-col gap-6">
			{#each screenshotsByMonth as { month, screenshots: monthShots }}
				<section class="space-y-4">
					<h2 class="text-sm font-medium text-muted-foreground">{month}</h2>
					<div
						class="gap-4 [column-fill:balance]"
						style="column-width: {getColumnWidthPx(zoomLevel)}px"
					>
					{#each monthShots as shot (shot.id)}
				<div
					class="group relative mb-4 inline-block w-full break-inside-avoid overflow-hidden rounded-lg border bg-muted {selected?.id === shot.id
						? 'border-2 border-primary'
						: 'border border-border'}"
				>
					<button
						type="button"
						class="block w-full aspect-square overflow-hidden text-left"
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
							width={400}
							height={400}
							loading="lazy"
							class="size-full object-cover transition-transform group-hover:scale-105 bg-muted/50"
						/>
					</button>
					<Button
						variant="ghost"
						size="icon"
						class="absolute left-2 bottom-2 size-8 rounded-md bg-black/50 text-white transition-opacity group-hover:opacity-100 hover:bg-black/70 {shot.favourite ? 'opacity-100' : 'opacity-0'}"
						aria-label={shot.favourite ? 'Remove from favourites' : 'Add to favourites'}
						aria-pressed={shot.favourite}
						onclick={(e) => handleFavouriteToggle(e, shot)}
					>
						<Heart
							class="size-4 transition-colors {shot.favourite
								? 'fill-primary text-primary'
								: 'text-white/90'}"
						/>
					</Button>
					<Popover.Root
						open={menuOpenForId === shot.id}
						onOpenChange={(o) => (menuOpenForId = o ? shot.id : null)}
					>
						<Popover.Trigger
							class="absolute right-2 top-2 size-8 rounded-md bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/70 flex items-center justify-center"
							aria-label="Screenshot options"
							onclick={(e) => e.stopPropagation()}
						>
							<MoreVertical class="size-4" />
						</Popover.Trigger>
						<Popover.Portal>
							<Popover.Content align="end" side="bottom" class="w-44 p-1" onclick={(e) => e.stopPropagation()}>
								<button
									type="button"
									class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
									onclick={(e) => handleDownload(e, shot)}
								>
									<Download class="size-4" />
									Download
								</button>
								<button
									type="button"
									class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
									onclick={(e) => handleOpenImage(e, shot)}
								>
									<Maximize2 class="size-4" />
									Open image
								</button>
								<button
									type="button"
									class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 hover:text-destructive"
									onclick={(e) => handlePermanentDelete(e, shot)}
								>
									<Trash2 class="size-4" />
									Delete permanently
								</button>
							</Popover.Content>
						</Popover.Portal>
					</Popover.Root>
				</div>
					{/each}
					</div>
				</section>
			{/each}
		</div>
	{/if}
</div>
