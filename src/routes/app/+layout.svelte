<script lang="ts">
	import { setContext } from 'svelte';
	import { writable } from 'svelte/store';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import AppTopBar from '$lib/components/app/AppTopBar.svelte';
	import AppLeftSidebar from '$lib/components/app/AppLeftSidebar.svelte';
	import AppCenterArea from '$lib/components/app/AppCenterArea.svelte';
	import AppRightSidebar from '$lib/components/app/AppRightSidebar.svelte';
	import { cloudinaryUrl } from '$lib/cloudinary.js';
	import { X, ChevronLeft, ChevronRight, Pencil } from '@lucide/svelte';
	import AnnotationCanvas from '$lib/components/app/AnnotationCanvas.svelte';
	import AnnotationOverlay from '$lib/components/app/AnnotationOverlay.svelte';
	import FlowCanvas from '$lib/components/app/FlowCanvas.svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	type Screenshot = {
		id: number;
		url: string;
		fileName: string;
		note?: string | null;
		favourite?: boolean;
		annotationData?: { strokes?: { points: { x: number; y: number }[]; color?: string; width?: number }[] } | null;
		createdAt: Date;
		folder?: { id: number; name: string } | null;
		tags?: { id: number; dimension: string; label: string; sortOrder: number }[];
	};

	let selectedScreenshot = $state<Screenshot | null>(null);
	let fullscreenScreenshot = $state<Screenshot | null>(null);
	let fullscreenEditMode = $state(false);
	let fullscreenContainerRef: HTMLDivElement;
	let fullscreenImgRef: HTMLImageElement;

	setContext('selectedScreenshot', {
		get selected() {
			return selectedScreenshot;
		},
		setSelected(s: Screenshot | null) {
			selectedScreenshot = s;
		}
	});

	setContext('fullscreenScreenshot', {
		get screenshot() {
			return fullscreenScreenshot;
		},
		setFullscreen(s: Screenshot | null) {
			fullscreenScreenshot = s;
		}
	});

	const currentScreenshotsStore = writable<Screenshot[]>([]);
	setContext('currentScreenshots', currentScreenshotsStore);

	const showAnnotationsStore = writable<Record<number, boolean>>({});
	setContext('showAnnotations', showAnnotationsStore);

	let flowOpen = $state(false);
	let flowScreenshots = $state<Screenshot[]>([]);
	let flowFolderId = $state<number | null>(null);
	let flowEditId = $state<number | null>(null);
	let flowInitialData = $state<{
		nodes: { id: number; x: number; y: number; width: number; height: number }[];
		arrows: { from: number; to: number }[];
		freeArrows?: { fromX: number; fromY: number; toX: number; toY: number }[];
		canvasMarkup?: { strokes?: { points: { x: number; y: number }[]; color?: string; width?: number }[] };
	} | null>(null);
	setContext('flowCanvas', {
		openFlow(screenshots: Screenshot[], folderId: number | null) {
			flowScreenshots = screenshots;
			flowFolderId = folderId;
			flowEditId = null;
			flowInitialData = null;
			flowOpen = true;
		},
		async openFlowForEdit(flowId: number) {
			try {
				const res = await fetch(`/app/flow/${flowId}`);
				const json = await res.json();
				if (!json?.success || !json?.flow) return;
				const { flow: f, screenshots: ss } = json;
				flowScreenshots = ss ?? [];
				flowFolderId = f.folderId ?? null;
				flowEditId = flowId;
				const fd = f.flowData ?? {};
				flowInitialData = {
					nodes: fd.nodes ?? [],
					arrows: fd.arrows ?? [],
					freeArrows: fd.freeArrows ?? [],
					canvasMarkup: fd.canvasMarkup ?? undefined
				};
				flowOpen = true;
			} catch (err) {
				console.error('Failed to load flow:', err);
			}
		},
		closeFlow() {
			flowOpen = false;
			flowScreenshots = [];
			flowFolderId = null;
			flowEditId = null;
			flowInitialData = null;
		}
	});

	let screenshots = $state<Screenshot[]>([]);
	$effect(() => {
		const unsub = currentScreenshotsStore.subscribe((v) => {
			screenshots = v;
		});
		return unsub;
	});
	const fullscreenIndex = $derived(
		fullscreenScreenshot && screenshots.length > 0
			? screenshots.findIndex((s) => s.id === fullscreenScreenshot.id)
			: -1
	);
	const prevFullscreen = $derived(
		fullscreenIndex > 0 ? screenshots[fullscreenIndex - 1] : null
	);
	const nextFullscreen = $derived(
		fullscreenIndex >= 0 && fullscreenIndex < screenshots.length - 1
			? screenshots[fullscreenIndex + 1]
			: null
	);

	function goFullscreenPrev() {
		if (prevFullscreen) {
			fullscreenScreenshot = prevFullscreen;
			selectedScreenshot = prevFullscreen;
			fullscreenEditMode = false;
		}
	}

	function goFullscreenNext() {
		if (nextFullscreen) {
			fullscreenScreenshot = nextFullscreen;
			selectedScreenshot = nextFullscreen;
			fullscreenEditMode = false;
		}
	}

	async function handleSaveAnnotations(data: { strokes?: { points: { x: number; y: number }[]; color?: string; width?: number }[] }) {
		if (!fullscreenScreenshot) return;
		const formData = new FormData();
		formData.append('id', String(fullscreenScreenshot.id));
		formData.append('folderId', fullscreenScreenshot.folder?.id != null ? String(fullscreenScreenshot.folder.id) : '');
		formData.append('tags', (fullscreenScreenshot.tags ?? []).map((t) => t.id).join(','));
		formData.append('annotationData', JSON.stringify(data));
		try {
			const res = await fetch('/app/screenshot/update', { method: 'POST', body: formData });
			const json = await res.json();
			if (json?.success) {
				const updated = { ...fullscreenScreenshot, annotationData: data };
				fullscreenScreenshot = updated;
				selectedScreenshot = updated;
				fullscreenEditMode = false;
				await import('$app/navigation').then((m) => m.invalidateAll());
			}
		} catch (err) {
			console.error('Save annotations failed:', err);
		}
	}

	$effect(() => {
		function handleKeydown(e: KeyboardEvent) {
			const target = e.target as HTMLElement;
			const inInput = target?.closest?.('input, textarea, [contenteditable="true"]');
			if (inInput && !fullscreenScreenshot) return;

			if (fullscreenScreenshot) {
				if (e.key === 'Escape') {
					if (fullscreenEditMode) fullscreenEditMode = false;
					else fullscreenScreenshot = null;
				}
				if (!fullscreenEditMode) {
					if (e.key === 'ArrowLeft') {
						e.preventDefault();
						goFullscreenPrev();
					}
					if (e.key === 'ArrowRight') {
						e.preventDefault();
						goFullscreenNext();
					}
				}
				return;
			}
			if (selectedScreenshot && screenshots.length > 0) {
				const idx = screenshots.findIndex((s) => s.id === selectedScreenshot.id);
				if (e.key === 'ArrowLeft' && idx > 0) {
					e.preventDefault();
					selectedScreenshot = screenshots[idx - 1];
				}
				if (e.key === 'ArrowRight' && idx < screenshots.length - 1) {
					e.preventDefault();
					selectedScreenshot = screenshots[idx + 1];
				}
			}
		}
		document.addEventListener('keydown', handleKeydown);
		return () => document.removeEventListener('keydown', handleKeydown);
	});
</script>

<Sidebar.Provider>
	<div class="app-layout flex h-svh w-full flex-col overflow-hidden">
		<AppTopBar user={data.user} />
		<div class="flex min-h-0 flex-1 overflow-hidden pt-[calc(var(--spacing-top-bar)+0.5rem)]">
			<AppLeftSidebar
				folders={data.folders ?? []}
				counts={data.counts ?? { all: 0, uncategorised: 0, trash: 0 }}
			/>
			<Sidebar.Inset class="min-h-0 overflow-hidden">
				<div class="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
					<div class="flex min-h-0 flex-1 overflow-hidden">
						<AppCenterArea tags={data.tags ?? []} tagCounts={data.tagCounts ?? {}} folders={data.folders ?? []}>
							{@render children?.()}
						</AppCenterArea>
						<AppRightSidebar
							selectedScreenshot={selectedScreenshot}
							screenshots={screenshots}
							folders={data.folders ?? []}
							tags={data.tags ?? []}
							showAnnotationsStore={showAnnotationsStore}
						/>
					</div>
				</div>
			</Sidebar.Inset>
		</div>
	</div>

	{#if fullscreenScreenshot}
		<div
			role="dialog"
			aria-modal="true"
			aria-label="Screenshot fullscreen view"
			tabindex="-1"
			class="fixed inset-0 z-[9999] flex flex-col overflow-hidden bg-black/90 p-4"
			onclick={() => !fullscreenEditMode && (fullscreenScreenshot = null)}
			onkeydown={(e) => e.key === 'Escape' && (fullscreenEditMode ? (fullscreenEditMode = false) : (fullscreenScreenshot = null))}
		>
			<div class="absolute right-4 top-4 z-10 flex gap-2">
				{#if !fullscreenEditMode}
					<button
						type="button"
						class="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-primary-foreground shadow-xs transition-colors hover:bg-primary-hover"
						aria-label="Mark up"
						onclick={(e) => {
							e.stopPropagation();
							fullscreenEditMode = true;
						}}
					>
						<Pencil class="size-5" />
						<span>Mark up</span>
					</button>
				{/if}
				<button
					type="button"
					class="rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
					aria-label="Close fullscreen"
					onclick={(e) => {
						e.stopPropagation();
						fullscreenScreenshot = null;
						fullscreenEditMode = false;
					}}
				>
					<X class="size-6" />
				</button>
			</div>
			{#if prevFullscreen && !fullscreenEditMode}
				<button
					type="button"
					class="absolute left-4 top-1/2 z-10 -translate-y-1/2 flex items-center justify-center rounded-full size-12 bg-black/60 text-white hover:bg-black/80 transition-colors border border-white/20"
					aria-label="Previous image"
					onclick={(e) => {
						e.stopPropagation();
						goFullscreenPrev();
					}}
				>
					<ChevronLeft class="size-8" />
				</button>
			{/if}
			{#if nextFullscreen && !fullscreenEditMode}
				<button
					type="button"
					class="absolute right-4 top-1/2 z-10 -translate-y-1/2 flex items-center justify-center rounded-full size-12 bg-black/60 text-white hover:bg-black/80 transition-colors border border-white/20"
					aria-label="Next image"
					onclick={(e) => {
						e.stopPropagation();
						goFullscreenNext();
					}}
				>
					<ChevronRight class="size-8" />
				</button>
			{/if}
			<div
				class="relative min-h-0 flex-1 flex items-center justify-center overflow-hidden"
				onclick={(e) => e.stopPropagation()}
				onkeydown={(e) => e.stopPropagation()}
				role="presentation"
			>
				{#if fullscreenEditMode}
					<AnnotationCanvas
						key={fullscreenScreenshot.id}
						imageSrc={cloudinaryUrl(fullscreenScreenshot.url, 'fullscreen')}
						imageAlt={fullscreenScreenshot.fileName}
						initialData={fullscreenScreenshot.annotationData ?? undefined}
						onSave={handleSaveAnnotations}
						onCancel={() => (fullscreenEditMode = false)}
					/>
				{:else}
					<div bind:this={fullscreenContainerRef} class="relative size-full flex min-h-0 flex-1 items-center justify-center overflow-hidden">
						<img
							bind:this={fullscreenImgRef}
							src={cloudinaryUrl(fullscreenScreenshot.url, 'fullscreen')}
							alt={fullscreenScreenshot.fileName}
							class="max-h-full max-w-full w-auto h-auto object-contain"
						/>
						{#if fullscreenScreenshot.annotationData?.strokes?.length}
							<AnnotationOverlay
								key="fullscreen-{fullscreenScreenshot.id}-{fullscreenScreenshot.annotationData?.strokes?.length ?? 0}"
								annotationData={fullscreenScreenshot.annotationData}
								containerRef={fullscreenContainerRef}
								imageRef={fullscreenImgRef}
							/>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	{/if}

	{#if flowOpen && (flowScreenshots.length > 0 || flowEditId != null)}
		<FlowCanvas
			screenshots={flowScreenshots}
			folderId={flowFolderId}
			initialNodes={flowInitialData?.nodes}
			initialArrows={flowInitialData?.arrows}
			initialFreeArrows={flowInitialData?.freeArrows}
			initialCanvasMarkup={flowInitialData?.canvasMarkup}
			onSave={async (data) => {
				if (flowEditId != null) {
					const res = await fetch(`/app/flow/${flowEditId}/update`, {
						method: 'PUT',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ flowData: data })
					});
					const json = await res.json();
					if (json?.success) {
						flowOpen = false;
						flowScreenshots = [];
						flowFolderId = null;
						flowEditId = null;
						flowInitialData = null;
						await import('$app/navigation').then((m) => m.invalidateAll());
					}
				} else {
					const formData = new FormData();
					formData.append('flowData', JSON.stringify(data));
					formData.append('folderId', flowFolderId != null ? String(flowFolderId) : '');
					const res = await fetch('/app/flow/create', { method: 'POST', body: formData });
					const json = await res.json();
					if (json?.success) {
						flowOpen = false;
						flowScreenshots = [];
						flowFolderId = null;
						await import('$app/navigation').then((m) => m.invalidateAll());
					}
				}
			}}
			onCancel={() => {
				flowOpen = false;
				flowScreenshots = [];
				flowFolderId = null;
				flowEditId = null;
				flowInitialData = null;
			}}
		/>
	{/if}
</Sidebar.Provider>
