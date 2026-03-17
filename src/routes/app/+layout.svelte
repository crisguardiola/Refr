<script lang="ts">
	import { setContext } from 'svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import AppTopBar from '$lib/components/app/AppTopBar.svelte';
	import AppLeftSidebar from '$lib/components/app/AppLeftSidebar.svelte';
	import AppCenterArea from '$lib/components/app/AppCenterArea.svelte';
	import AppRightSidebar from '$lib/components/app/AppRightSidebar.svelte';
	import { cloudinaryUrl } from '$lib/cloudinary.js';
	import { X } from '@lucide/svelte';
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

	$effect(() => {
		if (!fullscreenScreenshot) return;
		function handleKeydown(e: KeyboardEvent) {
			if (e.key === 'Escape') fullscreenScreenshot = null;
		}
		document.addEventListener('keydown', handleKeydown);
		return () => document.removeEventListener('keydown', handleKeydown);
	});
</script>

<Sidebar.Provider>
	<div class="app-layout flex min-h-svh w-full flex-col">
		<AppTopBar />
		<div class="flex min-h-0 flex-1 pt-14">
			<AppLeftSidebar
				folders={data.folders ?? []}
				counts={data.counts ?? { all: 0, uncategorised: 0, trash: 0 }}
			/>
			<Sidebar.Inset>
				<div class="flex h-full flex-col overflow-hidden">
					<div class="flex min-h-0 flex-1">
						<AppCenterArea tags={data.tags ?? []} tagCounts={data.tagCounts ?? {}}>
							{@render children?.()}
						</AppCenterArea>
						<AppRightSidebar
							selectedScreenshot={selectedScreenshot}
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
