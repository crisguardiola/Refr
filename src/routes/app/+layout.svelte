<script lang="ts">
	import { setContext } from 'svelte';
	import { writable } from 'svelte/store';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import AppTopBar from '$lib/components/app/AppTopBar.svelte';
	import AppLeftSidebar from '$lib/components/app/AppLeftSidebar.svelte';
	import AppCenterArea from '$lib/components/app/AppCenterArea.svelte';
	import AppRightSidebar from '$lib/components/app/AppRightSidebar.svelte';
	import { cloudinaryUrl } from '$lib/cloudinary.js';
	import { X, ChevronLeft, ChevronRight } from '@lucide/svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	type Screenshot = {
		id: number;
		url: string;
		fileName: string;
		note?: string | null;
		favourite?: boolean;
		createdAt: Date;
		folder?: { id: number; name: string } | null;
		tags?: { id: number; dimension: string; label: string; sortOrder: number }[];
	};

	let selectedScreenshot = $state<Screenshot | null>(null);
	let fullscreenScreenshot = $state<Screenshot | null>(null);

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
		}
	}

	function goFullscreenNext() {
		if (nextFullscreen) {
			fullscreenScreenshot = nextFullscreen;
			selectedScreenshot = nextFullscreen;
		}
	}

	$effect(() => {
		function handleKeydown(e: KeyboardEvent) {
			const target = e.target as HTMLElement;
			const inInput = target?.closest?.('input, textarea, [contenteditable="true"]');
			if (inInput && !fullscreenScreenshot) return;

			if (fullscreenScreenshot) {
				if (e.key === 'Escape') fullscreenScreenshot = null;
				if (e.key === 'ArrowLeft') {
					e.preventDefault();
					goFullscreenPrev();
				}
				if (e.key === 'ArrowRight') {
					e.preventDefault();
					goFullscreenNext();
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
			class="fixed inset-0 z-[9999] flex flex-col bg-black/90 p-4"
			onclick={() => (fullscreenScreenshot = null)}
			onkeydown={(e) => e.key === 'Escape' && (fullscreenScreenshot = null)}
		>
			<button
				type="button"
				class="absolute right-4 top-4 z-10 rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
				aria-label="Close fullscreen"
				onclick={(e) => {
					e.stopPropagation();
					fullscreenScreenshot = null;
				}}
			>
				<X class="size-6" />
			</button>
			{#if prevFullscreen}
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
			{#if nextFullscreen}
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
				class="min-h-0 flex-1 flex items-center justify-center"
				onclick={(e) => e.stopPropagation()}
				onkeydown={(e) => e.stopPropagation()}
				role="presentation"
			>
				<img
					src={cloudinaryUrl(fullscreenScreenshot.url, 'fullscreen')}
					alt={fullscreenScreenshot.fileName}
					class="max-h-full max-w-full w-auto h-auto object-contain"
				/>
			</div>
		</div>
	{/if}
</Sidebar.Provider>
