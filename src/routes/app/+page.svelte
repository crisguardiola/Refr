<script lang="ts">
	import { getContext } from 'svelte';
	import { page } from '$app/stores';
	import { invalidateAll } from '$app/navigation';
	import { Copy, Download, Heart, Maximize2, MoreVertical, Square, SquareCheck, Trash2, Upload, Workflow } from '@lucide/svelte';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import UploadDropZone from '$lib/components/app/UploadDropZone.svelte';
	import { SCREENSHOT_DRAG_TYPE, duplicateScreenshot, moveScreenshot, type ScreenshotDragData } from '$lib/move-screenshot.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { cloudinaryUrl } from '$lib/cloudinary.js';
	import { filterScreenshots } from '$lib/filter-screenshots.js';
	import { groupScreenshotsByMonth } from '$lib/group-screenshots-by-month.js';
	import { getColumnWidthPx } from '$lib/thumbnail-zoom.js';
	import UploadPreviewSheet from '$lib/components/app/UploadPreviewSheet.svelte';
	import ThumbnailWithOverlay from '$lib/components/app/ThumbnailWithOverlay.svelte';
	import type { Writable } from 'svelte/store';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type Screenshot = {
		id: number;
		url: string;
		fileName: string;
		note?: string | null;
		favourite?: boolean;
		annotationData?: { strokes?: { points: { x: number; y: number }[]; color?: string; width?: number }[] } | null;
		createdAt: Date | string;
		folder?: { id: number; name: string } | null;
		tags?: { id: number }[];
	};
	const selectedCtx = getContext<{
		selected: Screenshot | null;
		setSelected: (s: Screenshot | null) => void;
	}>('selectedScreenshot');
	const fullscreenCtx = getContext<{ setFullscreen: (s: Screenshot | null) => void }>('fullscreenScreenshot');
	const flowCtx = getContext<{ openFlow: (screenshots: Screenshot[], folderId: number | null) => void }>('flowCanvas');
	const currentScreenshotsStore = getContext<import('svelte/store').Writable<Screenshot[]>>('currentScreenshots');
	$effect(() => {
		currentScreenshotsStore?.set(data.screenshots ?? []);
	});
	const filterStore = getContext<{ subscribe: (fn: (v: { searchQuery: string; selectedTagIds: number[]; favouritesOnly: boolean }) => void) => () => void }>('screenshotFilters');
	const zoomStore = getContext<Writable<number>>('thumbnailZoom');
	const showAnnotationsStore = getContext<import('svelte/store').Writable<Record<number, boolean>>>('showAnnotations');

	const uploadAction = $derived($page.url.pathname + '?/uploadScreenshot');

	let isDragging = $state(false);
	let fileInput: HTMLInputElement;
	let previewOpen = $state(false);
	let pendingFile = $state<File | null>(null);
	let previewUrl = $state<string | null>(null);

	const ACCEPT = 'image/png,image/jpeg,image/jpg,image/webp,image/gif';

	function openPreview(file: File) {
		if (previewUrl) URL.revokeObjectURL(previewUrl);
		pendingFile = file;
		previewUrl = URL.createObjectURL(file);
		previewOpen = true;
	}

	function closePreview() {
		if (previewUrl) {
			URL.revokeObjectURL(previewUrl);
			previewUrl = null;
		}
		pendingFile = null;
		previewOpen = false;
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		if (e.dataTransfer?.types.includes('Files')) {
			isDragging = true;
		}
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		isDragging = false;
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		isDragging = false;

		if (e.dataTransfer?.types.includes(SCREENSHOT_DRAG_TYPE)) return;

		const files = e.dataTransfer?.files;
		if (!files?.length) return;

		const imageFile = Array.from(files).find((f) =>
			['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'].includes(f.type)
		);
		if (imageFile) {
			openPreview(imageFile);
		}
	}

	function handleScreenshotDragStart(e: DragEvent, shot: { id: number; tags?: { id: number }[] }) {
		if (!e.dataTransfer) return;
		const data: ScreenshotDragData = {
			screenshotId: shot.id,
			tagIds: (shot.tags ?? []).map((t) => t.id)
		};
		e.dataTransfer.setData(SCREENSHOT_DRAG_TYPE, JSON.stringify(data));
		e.dataTransfer.effectAllowed = 'move';
	}

	function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) {
			openPreview(file);
			input.value = '';
		}
	}

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
	const defaultFolderId = $derived<number | null>(null);
	let menuOpenForId = $state<number | null>(null);
	let selectedIds = $state<Set<number>>(new Set());

	function toggleSelect(e: MouseEvent, shot: { id: number }) {
		e.preventDefault();
		e.stopPropagation();
		selectedIds = new Set(selectedIds);
		if (selectedIds.has(shot.id)) {
			selectedIds.delete(shot.id);
		} else {
			selectedIds.add(shot.id);
		}
	}

	function clearSelection() {
		selectedIds = new Set();
	}

	const selectedScreenshots = $derived(
		[...selectedIds].map((id) => screenshots.find((s) => s.id === id)).filter(Boolean) as Screenshot[]
	);

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

	async function handleMoveToTrash(e: MouseEvent, shot: { id: number; tags?: { id: number }[] }) {
		e.preventDefault();
		e.stopPropagation();
		menuOpenForId = null;
		const ok = await moveScreenshot(shot.id, 'trash', (shot.tags ?? []).map((t) => t.id));
		if (ok) {
			selectedCtx?.setSelected(null);
			await invalidateAll();
		}
	}

	async function handleDuplicate(e: MouseEvent, shot: { id: number }) {
		e.preventDefault();
		e.stopPropagation();
		menuOpenForId = null;
		const newId = await duplicateScreenshot(shot.id);
		if (newId != null) {
			await invalidateAll();
		}
	}

	async function handleBulkDownload() {
		for (const shot of selectedScreenshots) {
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
				await new Promise((r) => setTimeout(r, 300));
			} catch {
				window.open(url, '_blank');
			}
		}
		clearSelection();
	}

	async function handleBulkMoveToTrash() {
		for (const shot of selectedScreenshots) {
			await moveScreenshot(shot.id, 'trash', (shot.tags ?? []).map((t) => t.id));
		}
		if (selected && selectedIds.has(selected.id)) {
			selectedCtx?.setSelected(null);
		}
		clearSelection();
		await invalidateAll();
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

<input
	bind:this={fileInput}
	type="file"
	accept={ACCEPT}
	class="sr-only"
	onchange={handleFileSelect}
	aria-label="Upload screenshot"
/>
<div class="flex flex-1 flex-col gap-6">
	<div class="sticky top-0 z-10 flex items-center justify-between gap-4 bg-background/95 backdrop-blur-xl pb-4 -mt-4 pt-4">
		<div class="flex flex-col gap-2 min-w-0">
			<h1 class="text-2xl font-semibold tracking-tight">All</h1>
			{#if selectedIds.size > 0}
				<div class="flex items-center gap-2 flex-wrap">
					<span class="text-sm text-muted-foreground">{selectedIds.size} selected</span>
					{#if selectedIds.size > 1}
						<Button variant="outline" size="sm" class="gap-1.5" onclick={() => flowCtx?.openFlow(selectedScreenshots, selectedScreenshots[0]?.folder?.id ?? null)}>
							<Workflow class="size-4" />
							Start a flow
						</Button>
					{/if}
					<Button variant="outline" size="sm" class="gap-1.5" onclick={handleBulkDownload}>
						<Download class="size-4" />
						Download
					</Button>
					<Button variant="outline" size="sm" class="gap-1.5 text-destructive hover:text-destructive" onclick={handleBulkMoveToTrash}>
						<Trash2 class="size-4" />
						Move to trash
					</Button>
					<Button variant="ghost" size="sm" onclick={clearSelection}>Cancel</Button>
				</div>
			{/if}
		</div>
		<div class="flex items-center gap-4 shrink-0">
			<div class="flex items-center gap-2" role="group" aria-label="Thumbnail zoom">
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
			{#if !isEmpty}
				<Button
					variant="default"
					size="sm"
					class="gap-2"
					onclick={() => fileInput?.click()}
					onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), fileInput?.click())}
				>
					<Upload class="size-4" />
					Upload
				</Button>
			{/if}
		</div>
	</div>
	{#if isEmpty}
		<UploadDropZone
			variant="empty"
			emptyTitle="No screenshots in this folder"
			emptySubtitle="Drag and drop an image, or click to browse"
			dropTitle="Drop your screenshot here"
			dropSubtitle="Release to upload"
			{isDragging}
			onclick={() => fileInput?.click()}
			onkeydown={(e) => e.key === 'Enter' && fileInput?.click()}
			ondragover={handleDragOver}
			ondragleave={handleDragLeave}
			ondrop={handleDrop}
		/>
	{:else}
		<div
			class="flex flex-col gap-6 min-h-0"
			ondragover={handleDragOver}
			ondragleave={handleDragLeave}
			ondrop={handleDrop}
		>
			{#each screenshotsByMonth as { month, screenshots: monthShots }}
				<section class="space-y-4">
					<h2 class="text-sm font-medium text-muted-foreground">{month}</h2>
					<div
						class="gap-4 [column-fill:balance]"
						style="column-width: {getColumnWidthPx(zoomLevel)}px"
					>
					{#each monthShots as shot (shot.id)}
				<div
					role="listitem"
					class="group relative mb-4 inline-block w-full break-inside-avoid overflow-hidden rounded-lg border bg-muted cursor-grab active:cursor-grabbing {selected?.id === shot.id || selectedIds.has(shot.id)
						? 'border-2 border-primary'
						: 'border border-border'}"
					draggable="true"
					ondragstart={(e) => handleScreenshotDragStart(e, shot)}
				>
					<Button
						variant="ghost"
						size="icon"
						class="absolute left-2 top-2 z-10 size-8 rounded-md bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/70 flex items-center justify-center {selectedIds.has(shot.id) ? 'opacity-100' : ''}"
						aria-label={selectedIds.has(shot.id) ? 'Deselect' : 'Select for bulk actions'}
						aria-pressed={selectedIds.has(shot.id)}
						onclick={(e) => toggleSelect(e, shot)}
					>
						{#if selectedIds.has(shot.id)}
							<SquareCheck class="size-4 text-primary" />
						{:else}
							<Square class="size-4" />
						{/if}
					</Button>
					<button
						type="button"
						class="block w-full aspect-square overflow-hidden text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
						onclick={() => selectedCtx?.setSelected(selected?.id === shot.id ? null : shot)}
						ondblclick={(e) => {
							e.preventDefault();
							selectedCtx?.setSelected(shot);
							fullscreenCtx?.setFullscreen(shot);
						}}
					>
						<ThumbnailWithOverlay
							src={cloudinaryUrl(shot.url, 'thumbnail')}
							alt={shot.fileName}
							showAnnotations={(showAnnotationsStore ? $showAnnotationsStore : {})[shot.id] ?? true}
							annotationData={shot.annotationData}
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
									class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
									onclick={(e) => handleDuplicate(e, shot)}
								>
									<Copy class="size-4" />
									Duplicate image
								</button>
								<button
									type="button"
									class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 hover:text-destructive"
									onclick={(e) => handleMoveToTrash(e, shot)}
								>
									<Trash2 class="size-4" />
									Move to trash
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

	<UploadPreviewSheet
		open={previewOpen}
		previewUrl={previewUrl ?? ''}
		fileName={pendingFile?.name ?? ''}
		pendingFile={pendingFile}
		uploadAction={uploadAction}
		defaultFolderId={defaultFolderId}
		folders={data.folders ?? []}
		tags={data.tags ?? []}
		onOpenChange={(o) => {
			if (!o) closePreview();
			previewOpen = o;
		}}
		onSaveSuccess={closePreview}
	/>
</div>
