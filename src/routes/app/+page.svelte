<script lang="ts">
	import { getContext } from 'svelte';
	import { page } from '$app/stores';
	import { ImageIcon, Upload, X } from '@lucide/svelte';
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
	const filterStore = getContext<{ subscribe: (fn: (v: { searchQuery: string; selectedTagIds: number[]; selectedRating: number | null }) => void) => () => void }>('screenshotFilters');

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

		const files = e.dataTransfer?.files;
		if (!files?.length) return;

		const imageFile = Array.from(files).find((f) =>
			['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'].includes(f.type)
		);
		if (imageFile) {
			openPreview(imageFile);
		}
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
	const defaultFolderId = $derived<number | null>(null);
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
			role="button"
			tabindex="0"
			class="flex flex-1 flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed transition-colors cursor-pointer {isDragging
				? 'border-primary bg-primary/5'
				: 'border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/50'}"
			ondragover={handleDragOver}
			ondragleave={handleDragLeave}
			ondrop={handleDrop}
			onkeydown={(e) => e.key === 'Enter' && fileInput?.click()}
		>
			<div
				class="flex size-16 items-center justify-center rounded-full bg-muted transition-colors {isDragging
					? 'bg-primary/10'
					: ''}"
			>
				<ImageIcon class="size-8 text-muted-foreground" aria-hidden="true" />
			</div>
			<div class="text-center space-y-1">
				<p class="text-sm font-medium">
					{isDragging ? 'Drop your screenshot here' : 'No screenshots in this folder'}
				</p>
				<p class="text-muted-foreground text-xs">
					{isDragging ? 'Release to upload' : 'Drag and drop an image, or upload via button'}
				</p>
			</div>
			<input
				bind:this={fileInput}
				type="file"
				accept={ACCEPT}
				class="sr-only"
				onchange={handleFileSelect}
				aria-label="Upload screenshot"
			/>
			<Button
				variant="outline"
				size="sm"
				onclick={() => fileInput?.click()}
				onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), fileInput?.click())}
			>
				<Upload class="size-4" />
				Upload screenshot
			</Button>
		</div>
	{:else}
		<div class="columns-2 gap-4 sm:columns-3 md:columns-4 lg:columns-5">
			{#each screenshots as shot (shot.id)}
				<button
					type="button"
					class="group relative mb-4 block w-full break-inside-avoid overflow-hidden rounded-lg border border-border bg-muted text-left shadow-sm transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
			{/each}
			<div
				role="button"
				tabindex="0"
				class="flex min-h-24 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed transition-colors cursor-pointer break-inside-avoid mb-4 {isDragging
					? 'border-primary bg-primary/5'
					: 'border-muted-foreground/25 bg-muted/30 hover:border-muted-foreground/50 hover:bg-muted/50'}"
				ondragover={handleDragOver}
				ondragleave={handleDragLeave}
				ondrop={handleDrop}
				onclick={() => fileInput?.click()}
				onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), fileInput?.click())}
			>
				<Upload class="size-6 text-muted-foreground" />
				<span class="text-muted-foreground text-xs">
					{isDragging ? 'Drop to add' : 'Add more — drop or click'}
				</span>
				<input
					bind:this={fileInput}
					type="file"
					accept={ACCEPT}
					class="sr-only"
					onchange={handleFileSelect}
					aria-label="Upload screenshot"
				/>
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
