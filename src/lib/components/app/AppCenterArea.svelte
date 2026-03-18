<script lang="ts">
	import { setContext } from 'svelte';
	import { writable } from 'svelte/store';
	import { page } from '$app/stores';
	import type { Snippet } from 'svelte';
	import SearchAndFilterBar from './SearchAndFilterBar.svelte';
	import UploadPreviewSheet from './UploadPreviewSheet.svelte';
	import { SCREENSHOT_DRAG_TYPE } from '$lib/move-screenshot.js';

	type Tag = { id: number; dimension: string; label: string; sortOrder: number };
	type Folder = { id: number; name: string; count?: number };

	let {
		children,
		tags = [],
		tagCounts = {},
		folders = []
	}: {
		children?: Snippet;
		tags?: Tag[];
		tagCounts?: Record<number, number>;
		folders?: Folder[];
	} = $props();

	const filterStore = writable<{ searchQuery: string; selectedTagIds: number[]; favouritesOnly: boolean }>({
		searchQuery: '',
		selectedTagIds: [],
		favouritesOnly: false
	});
	setContext('screenshotFilters', filterStore);

	/** Zoom level 0–100: 50 = 5 cols (default), 0 = more cols, 100 = fewer cols */
	const thumbnailZoomStore = writable(50);
	setContext('thumbnailZoom', thumbnailZoomStore);

	const isUploadablePath = $derived(
		$page.url.pathname === '/app' ||
			$page.url.pathname === '/app/uncategorised' ||
			$page.url.pathname.startsWith('/app/folder/')
	);

	const isBugsPath = $derived($page.url.pathname === '/app/bugs');

	const uploadAction = $derived($page.url.pathname + '?/uploadScreenshot');
	const defaultFolderId = $derived.by(() => {
		const id = $page.params.folderId;
		if (!id) return null;
		const n = parseInt(id, 10);
		return Number.isNaN(n) ? null : n;
	});

	let isDragging = $state(false);
	let previewOpen = $state(false);
	let pendingFile = $state<File | null>(null);
	let previewUrl = $state<string | null>(null);

	const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];

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
		if (!isUploadablePath) return;
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
		if (!isUploadablePath) return;
		e.preventDefault();
		e.stopPropagation();
		isDragging = false;

		if (e.dataTransfer?.types.includes(SCREENSHOT_DRAG_TYPE)) return;

		const files = e.dataTransfer?.files;
		if (!files?.length) return;

		const imageFile = Array.from(files).find((f) => IMAGE_TYPES.includes(f.type));
		if (imageFile) {
			openPreview(imageFile);
		}
	}
</script>

<div
	class="flex min-h-0 min-w-0 flex-1 flex-col"
	data-slot="app-center"
>
	<!-- Search bar: fixed at top, no scroll (hidden on bugs page) -->
	{#if !isBugsPath}
		<div class="z-20 flex min-h-[var(--content-header-height)] shrink-0 flex-col justify-center bg-background/95 px-8 pt-4 pb-6 backdrop-blur-xl">
			<div>
				<SearchAndFilterBar
					{tags}
					{tagCounts}
					{filterStore}
				/>
			</div>
		</div>
	{/if}
	<!-- Content area: scrollbar only here, within screenshot area -->
	<div
		class="min-h-0 flex-1 overflow-y-auto p-8 {isBugsPath ? 'pt-8' : 'pt-0'} {isDragging ? 'ring-2 ring-primary ring-inset' : ''}"
		ondragover={handleDragOver}
		ondragleave={handleDragLeave}
		ondrop={handleDrop}
		role={isUploadablePath ? 'region' : undefined}
		aria-label={isUploadablePath ? 'Content area - drag and drop images to upload' : undefined}
	>
		{@render children?.()}
	</div>
</div>

<UploadPreviewSheet
	open={previewOpen}
	previewUrl={previewUrl ?? ''}
	fileName={pendingFile?.name ?? ''}
	pendingFile={pendingFile}
	{uploadAction}
	{defaultFolderId}
	{folders}
	{tags}
	onOpenChange={(o) => {
		if (!o) closePreview();
		previewOpen = o;
	}}
	onSaveSuccess={closePreview}
/>
