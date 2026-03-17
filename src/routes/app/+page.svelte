<script lang="ts">
	import { getContext } from 'svelte';
	import { page } from '$app/stores';
	import { Download, ImageIcon } from '@lucide/svelte';
	import UploadDropZone from '$lib/components/app/UploadDropZone.svelte';
	import { SCREENSHOT_DRAG_TYPE, type ScreenshotDragData } from '$lib/move-screenshot.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { cloudinaryUrl } from '$lib/cloudinary.js';
	import { filterScreenshots } from '$lib/filter-screenshots.js';
	import UploadPreviewSheet from '$lib/components/app/UploadPreviewSheet.svelte';
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
	const isEmpty = $derived(screenshots.length === 0);
	const selected = $derived(selectedCtx?.selected ?? null);
	const defaultFolderId = $derived<number | null>(null);

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

<input
	bind:this={fileInput}
	type="file"
	accept={ACCEPT}
	class="sr-only"
	onchange={handleFileSelect}
	aria-label="Upload screenshot"
/>
<div class="flex flex-1 flex-col gap-6">
	<h1 class="text-2xl font-semibold tracking-tight">All</h1>
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
		<div class="flex flex-col gap-4">
			<UploadDropZone
				variant="add-more"
				compact
				addMoreLabel="Add screenshot"
				addMoreSubtitle="Drop or click to upload"
				dropTitle="Drop to add"
				dropSubtitle="Release to upload"
				{isDragging}
				onclick={() => fileInput?.click()}
				onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), fileInput?.click())}
				ondragover={handleDragOver}
				ondragleave={handleDragLeave}
				ondrop={handleDrop}
				class="mb-0"
			/>
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
