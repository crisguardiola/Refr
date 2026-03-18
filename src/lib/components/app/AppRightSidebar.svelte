<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import { getContext } from 'svelte';
	import { cn } from '$lib/utils.js';
	import { cloudinaryUrl } from '$lib/cloudinary.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { ImageIcon, Trash2, Plus, X, Heart, Search, Maximize2, ChevronLeft, ChevronRight } from '@lucide/svelte';
	import { Input } from '$lib/components/ui/input/index.js';

	type Folder = { id: number; name: string; count?: number };
	type Tag = { id: number; dimension: string; label: string; sortOrder: number };

	const TAG_DROPDOWN_EST_HEIGHT = 220;

	type Screenshot = {
		id: number;
		url: string;
		fileName: string;
		note?: string | null;
		favourite?: boolean;
		createdAt: Date | string;
		folder?: { id: number; name: string } | null;
		tags?: Tag[];
	};

	let {
		selectedScreenshot = null,
		screenshots = [],
		folders = [],
		tags = []
	}: {
		selectedScreenshot?: Screenshot | null;
		screenshots?: Screenshot[];
		folders?: Folder[];
		tags?: Tag[];
	} = $props();

	const selectedCtx = getContext<{
		setSelected: (s: { id: number; url: string; fileName: string; note?: string | null; favourite?: boolean; createdAt: Date | string; folder?: { id: number; name: string } | null; tags?: Tag[] } | null) => void;
	}>('selectedScreenshot');
	const fullscreenCtx = getContext<{ setFullscreen: (s: Screenshot | null) => void }>('fullscreenScreenshot');

	let folderId = $state<string>('');
	let addTagOpenFor = $state<'screen' | 'ui' | null>(null);
	let tagSearchQuery = $state('');
	let permanentDeleteOpen = $state(false);
	let isSaving = $state(false);
	let isSavingDetails = $state(false);
	let addTagRef: HTMLDivElement;
	let addScreenTriggerRef: HTMLButtonElement;
	let addUiTriggerRef: HTMLButtonElement;
	let tagDropdownStyle = $state<{ top: string; left: string; width: string } | null>(null);
	let localFileName = $state('');
	let localNote = $state('');

	$effect(() => {
		if (!addTagOpenFor) return;
		const handler = (e: MouseEvent) => {
			const target = e.target as Node;
			if (addTagRef?.contains(target)) return;
			if (addScreenTriggerRef?.contains(target) || addUiTriggerRef?.contains(target)) return;
			addTagOpenFor = null;
		};
		const t = setTimeout(() => document.addEventListener('click', handler), 0);
		return () => {
			clearTimeout(t);
			document.removeEventListener('click', handler);
		};
	});

	$effect(() => {
		if (!addTagOpenFor) tagSearchQuery = '';
	});

	$effect(() => {
		if (!addTagOpenFor) {
			tagDropdownStyle = null;
			return;
		}
		const triggerRef = addTagOpenFor === 'screen' ? addScreenTriggerRef : addUiTriggerRef;
		if (!triggerRef) {
			tagDropdownStyle = null;
			return;
		}
		function updatePosition() {
			if (!triggerRef) return;
			const rect = triggerRef.getBoundingClientRect();
			const spaceBelow = window.innerHeight - rect.bottom;
			const spaceAbove = rect.top;
			const openUpward = spaceBelow < TAG_DROPDOWN_EST_HEIGHT && spaceAbove > spaceBelow;
			const width = 256;
			const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
			const top = openUpward
				? `${rect.top - TAG_DROPDOWN_EST_HEIGHT - 4}px`
				: `${rect.bottom + 4}px`;
			tagDropdownStyle = { top, left: `${left}px`, width: `${width}px` };
		}
		updatePosition();
		window.addEventListener('resize', updatePosition);
		return () => window.removeEventListener('resize', updatePosition);
	});

	$effect(() => {
		if (selectedScreenshot) {
			folderId = selectedScreenshot.folder?.id != null ? String(selectedScreenshot.folder.id) : '';
			localFileName = selectedScreenshot.fileName ?? '';
			localNote = selectedScreenshot.note ?? '';
		}
	});

	const formattedDate = $derived(
		selectedScreenshot?.createdAt
			? new Date(selectedScreenshot.createdAt).toLocaleDateString(undefined, {
					year: 'numeric',
					month: 'short',
					day: 'numeric',
					hour: '2-digit',
					minute: '2-digit'
				})
			: ''
	);

	const selectedTagIds = $derived(new Set((selectedScreenshot?.tags ?? []).map((t) => t.id)));

	const availableToAdd = $derived(
		tags.filter((t) => !selectedTagIds.has(t.id))
	);

	const availableToAddByDimension = $derived({
		screen: availableToAdd.filter((t) => t.dimension === 'screen'),
		ui: availableToAdd.filter((t) => t.dimension === 'ui_type' || t.dimension === 'color')
	});

	const filteredAvailableToAdd = $derived(
		(() => {
			const q = tagSearchQuery.trim().toLowerCase();
			const base = addTagOpenFor ? availableToAddByDimension[addTagOpenFor] : [];
			return q ? base.filter((t) => t.label.toLowerCase().includes(q)) : base;
		})()
	);

	const screenTags = $derived((selectedScreenshot?.tags ?? []).filter((t) => t.dimension === 'screen'));
	const uiElementTags = $derived(
		(selectedScreenshot?.tags ?? []).filter((t) => t.dimension === 'ui_type' || t.dimension === 'color')
	);

	const isTrashPage = $derived($page?.url?.pathname === '/app/trash');

	const currentIndex = $derived(
		selectedScreenshot && screenshots.length > 0
			? screenshots.findIndex((s) => s.id === selectedScreenshot.id)
			: -1
	);
	const prevScreenshot = $derived(
		currentIndex > 0 ? screenshots[currentIndex - 1] : null
	);
	const nextScreenshot = $derived(
		currentIndex >= 0 && currentIndex < screenshots.length - 1
			? screenshots[currentIndex + 1]
			: null
	);

	function openImage() {
		if (selectedScreenshot) fullscreenCtx?.setFullscreen(selectedScreenshot);
	}

	function goPrev() {
		if (prevScreenshot) {
			selectedCtx?.setSelected(prevScreenshot);
		}
	}

	function goNext() {
		if (nextScreenshot) {
			selectedCtx?.setSelected(nextScreenshot);
		}
	}

	async function updateScreenshot(payload: { folderId: string; tagIds: number[]; favourite?: boolean }) {
		if (!selectedScreenshot || isSaving) return;
		isSaving = true;
		const formData = new FormData();
		formData.append('id', String(selectedScreenshot.id));
		formData.append('folderId', payload.folderId);
		formData.append('tags', payload.tagIds.join(','));
		if (payload.favourite !== undefined) formData.append('favourite', payload.favourite ? '1' : '0');
		try {
			const res = await fetch('/app/screenshot/update', { method: 'POST', body: formData });
			const data = await res.json();
			if (data?.success) {
				const folderObj = payload.folderId
					? folders.find((f) => String(f.id) === payload.folderId)
					: null;
				const tagObjs = payload.tagIds
					.map((tid) => tags.find((t) => t.id === tid))
					.filter((t): t is Tag => t != null);
				selectedCtx?.setSelected({
					...selectedScreenshot,
					folder: folderObj ? { id: folderObj.id, name: folderObj.name } : null,
					tags: tagObjs,
					favourite: payload.favourite !== undefined ? payload.favourite : selectedScreenshot.favourite
				});
				await invalidateAll();
			}
		} catch (err) {
			console.error('Update screenshot failed:', err);
		} finally {
			isSaving = false;
		}
	}

	function handleFolderChange(e: Event) {
		const v = (e.target as HTMLSelectElement).value;
		folderId = v;
		updateScreenshot({ folderId: v, tagIds: [...selectedTagIds] });
	}

	function handleFavouriteToggle() {
		const next = !selectedScreenshot?.favourite;
		updateScreenshot({ folderId, tagIds: [...selectedTagIds], favourite: next });
		selectedCtx?.setSelected({ ...selectedScreenshot!, favourite: next });
	}

	function removeTag(tagId: number) {
		const next = [...selectedTagIds].filter((id) => id !== tagId);
		updateScreenshot({ folderId, tagIds: next });
	}

	function addTag(tagId: number) {
		addTagOpenFor = null;
		const next = [...selectedTagIds, tagId];
		updateScreenshot({ folderId, tagIds: next });
	}

	async function updateDetails(payload: { note?: string; fileName?: string }) {
		if (!selectedScreenshot || isSavingDetails) return;
		isSavingDetails = true;
		const formData = new FormData();
		formData.append('id', String(selectedScreenshot.id));
		formData.append('folderId', folderId);
		formData.append('tags', [...selectedTagIds].join(','));
		if (payload.note !== undefined) formData.append('note', payload.note);
		if (payload.fileName !== undefined) formData.append('fileName', payload.fileName);
		try {
			const res = await fetch('/app/screenshot/update', { method: 'POST', body: formData });
			const data = await res.json();
			if (data?.success) {
				selectedCtx?.setSelected({
					...selectedScreenshot,
					note: payload.note ?? selectedScreenshot.note,
					fileName: payload.fileName ?? selectedScreenshot.fileName
				});
				await invalidateAll();
			}
		} catch (err) {
			console.error('Update details failed:', err);
		} finally {
			isSavingDetails = false;
		}
	}

	function handleFileNameBlur() {
		const trimmed = localFileName.trim();
		if (trimmed && trimmed !== selectedScreenshot?.fileName) {
			updateDetails({ fileName: trimmed });
		} else if (!trimmed) {
			localFileName = selectedScreenshot?.fileName ?? '';
		}
	}

	function handleNoteBlur() {
		const trimmed = localNote.trim();
		const current = selectedScreenshot?.note ?? '';
		if (trimmed !== current) {
			updateDetails({ note: trimmed || '' });
		}
	}
</script>

<aside
	class={cn(
		'flex min-h-0 w-64 shrink-0 flex-col overflow-auto rounded-xl p-4 m-2',
		'sm:w-72 lg:w-80'
	)}
	data-slot="app-right-sidebar"
>
	{#if selectedScreenshot}
		<div class="flex flex-col gap-6">
			<div class="space-y-2">
				<h3 class="text-sm font-semibold">Details</h3>
				<div class="relative aspect-square w-full overflow-hidden rounded-lg border border-border bg-muted/30 group">
					<button
						type="button"
						onclick={openImage}
						class="absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded-md bg-black/60 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-ring"
						aria-label="Open image"
					>
						<Maximize2 class="size-4 inline-block" />
						<span class="ml-1.5">Open image</span>
					</button>
					{#if prevScreenshot || nextScreenshot}
						<div class="absolute inset-x-0 bottom-2 z-10 flex items-center justify-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
							<button
								type="button"
								onclick={goPrev}
								disabled={!prevScreenshot}
								class="rounded-md bg-black/60 p-1.5 text-white transition-colors hover:bg-black/80 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-black/60"
								aria-label="Previous image"
							>
								<ChevronLeft class="size-5" />
							</button>
							<button
								type="button"
								onclick={goNext}
								disabled={!nextScreenshot}
								class="rounded-md bg-black/60 p-1.5 text-white transition-colors hover:bg-black/80 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-black/60"
								aria-label="Next image"
							>
								<ChevronRight class="size-5" />
							</button>
						</div>
					{/if}
					<img
						src={cloudinaryUrl(selectedScreenshot.url, 'sidebar')}
						alt={selectedScreenshot.fileName}
						class="size-full object-cover"
					/>
				</div>
			</div>
			<dl class="space-y-3 text-sm">
				<div>
					<dt class="text-muted-foreground">File name</dt>
					<dd class="mt-0.5">
						<input
							type="text"
							bind:value={localFileName}
							onblur={handleFileNameBlur}
							disabled={isSavingDetails}
							class="w-full rounded-md border border-input bg-transparent px-2 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring"
							placeholder="File name"
						/>
					</dd>
				</div>
				<div>
					<dt class="text-muted-foreground">Added</dt>
					<dd class="mt-0.5 font-medium">{formattedDate}</dd>
				</div>
				<div>
					<dt class="text-muted-foreground">Favourite</dt>
					<dd class="mt-0.5">
						<button
							type="button"
							onclick={handleFavouriteToggle}
							disabled={isSaving}
							class="rounded p-1 transition-colors hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
							aria-label={selectedScreenshot.favourite ? 'Remove from favourites' : 'Add to favourites'}
							aria-pressed={selectedScreenshot.favourite}
						>
							<Heart
								class="size-6 transition-colors {selectedScreenshot.favourite
									? 'fill-rose-500 text-rose-500'
									: 'text-muted-foreground/40 hover:text-muted-foreground/70'}"
							/>
						</button>
						<p class="mt-1 text-xs text-muted-foreground">
							{selectedScreenshot.favourite ? 'Favourited' : 'Click to favourite'}
						</p>
					</dd>
				</div>
				<div>
					<dt class="text-muted-foreground">Note</dt>
					<dd class="mt-0.5">
						<textarea
							bind:value={localNote}
							onblur={handleNoteBlur}
							disabled={isSavingDetails}
							rows={3}
							class="w-full resize-none rounded-md border border-input bg-transparent px-2 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring"
							placeholder="Add a note..."
						/>
					</dd>
				</div>
				<div>
					<dt class="text-muted-foreground">Folder</dt>
					<dd class="mt-0.5">
						<select
							bind:value={folderId}
							onchange={handleFolderChange}
							disabled={isSaving}
							class="flex h-8 w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm"
						>
							<option value="">Uncategorised</option>
							{#each folders as f (f.id)}
								<option value={String(f.id)}>{f.name}</option>
							{/each}
						</select>
					</dd>
				</div>
				<div>
					<dt class="text-muted-foreground">Screens</dt>
					<dd class="mt-0.5">
						<div class="flex flex-wrap items-center gap-1.5">
							{#each screenTags as t (t.id)}
								<span
									class="inline-flex items-center gap-1 rounded-full bg-muted pl-2 pr-1 py-0.5 text-xs"
								>
									{t.label}
									<button
										type="button"
										onclick={() => removeTag(t.id)}
										disabled={isSaving}
										class="rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors"
										aria-label="Remove {t.label}"
									>
										<X class="size-3" />
									</button>
								</span>
							{/each}
							<div class="relative">
								<button
									bind:this={addScreenTriggerRef}
									type="button"
									onclick={(e) => {
										e.stopPropagation();
										addTagOpenFor = addTagOpenFor === 'screen' ? null : 'screen';
									}}
									disabled={isSaving}
									class="inline-flex items-center justify-center rounded-full border border-dashed border-muted-foreground/40 p-1 hover:border-muted-foreground/60 hover:bg-muted/50 transition-colors"
									aria-label="Add screen"
								>
									<Plus class="size-3.5 text-muted-foreground" />
								</button>
							</div>
						</div>
						{#if screenTags.length === 0 && addTagOpenFor !== 'screen'}
							<p class="mt-1 text-xs text-muted-foreground">No screens. Click + to add.</p>
						{/if}
					</dd>
				</div>
				<div>
					<dt class="text-muted-foreground">UI Elements</dt>
					<dd class="mt-0.5">
						<div class="flex flex-wrap items-center gap-1.5">
							{#each uiElementTags as t (t.id)}
								<span
									class="inline-flex items-center gap-1 rounded-full bg-muted pl-2 pr-1 py-0.5 text-xs"
								>
									{t.label}
									<button
										type="button"
										onclick={() => removeTag(t.id)}
										disabled={isSaving}
										class="rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors"
										aria-label="Remove {t.label}"
									>
										<X class="size-3" />
									</button>
								</span>
							{/each}
							<div class="relative">
								<button
									bind:this={addUiTriggerRef}
									type="button"
									onclick={(e) => {
										e.stopPropagation();
										addTagOpenFor = addTagOpenFor === 'ui' ? null : 'ui';
									}}
									disabled={isSaving}
									class="inline-flex items-center justify-center rounded-full border border-dashed border-muted-foreground/40 p-1 hover:border-muted-foreground/60 hover:bg-muted/50 transition-colors"
									aria-label="Add UI element"
								>
									<Plus class="size-3.5 text-muted-foreground" />
								</button>
							</div>
						</div>
						{#if uiElementTags.length === 0 && addTagOpenFor !== 'ui'}
							<p class="mt-1 text-xs text-muted-foreground">No UI elements. Click + to add.</p>
						{/if}
					</dd>
				</div>
				{#if addTagOpenFor && tagDropdownStyle}
					<div
						bind:this={addTagRef}
						class="fixed z-50 overflow-hidden rounded-md bg-background"
						style="top: {tagDropdownStyle.top}; left: {tagDropdownStyle.left}; width: {tagDropdownStyle.width};"
						role="listbox"
					>
						<div class="border-b border-border p-1.5">
							<div class="relative">
								<Search
									class="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
									aria-hidden="true"
								/>
								<Input
									bind:value={tagSearchQuery}
									type="search"
									placeholder={addTagOpenFor === 'screen' ? 'Search screens...' : 'Search UI elements...'}
									class="h-8 pl-7 text-xs"
									aria-label={addTagOpenFor === 'screen' ? 'Search screens' : 'Search UI elements'}
								/>
							</div>
						</div>
						<div class="max-h-40 overflow-auto py-1">
							{#if availableToAddByDimension[addTagOpenFor].length === 0}
								<p class="px-3 py-2 text-xs text-muted-foreground">
									{addTagOpenFor === 'screen' ? 'All screens added' : 'All UI elements added'}
								</p>
							{:else if filteredAvailableToAdd.length === 0}
								<p class="px-3 py-2 text-xs text-muted-foreground">
									{addTagOpenFor === 'screen' ? 'No matching screens' : 'No matching UI elements'}
								</p>
							{:else}
								{#each filteredAvailableToAdd as t (t.id)}
									<button
										type="button"
										role="option"
										aria-selected="false"
										onclick={() => addTag(t.id)}
										class="block w-full px-3 py-1.5 text-left text-sm hover:bg-muted"
									>
										{t.label}
										<span class="text-muted-foreground text-xs"> — {t.dimension === 'ui_type' ? 'UI element' : t.dimension === 'screen' ? 'Screen' : t.dimension}</span>
									</button>
								{/each}
							{/if}
						</div>
					</div>
				{/if}
			</dl>
			{#if isTrashPage}
				<div class="flex flex-col gap-2">
					<form
						method="post"
						action="/app/trash?/restore"
						use:enhance={() => {
							return async ({ result }) => {
								if (result.type === 'success') {
									selectedCtx?.setSelected(null);
									await invalidateAll();
								}
							};
						}}
					>
						<input type="hidden" name="id" value={selectedScreenshot.id} />
						<Button type="submit" variant="outline" size="sm" class="w-full">
							Restore
						</Button>
					</form>
					<Button
						type="button"
						variant="outline"
						size="sm"
						class="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
						onclick={() => (permanentDeleteOpen = true)}
					>
						Delete permanently
					</Button>
				</div>
			{:else}
				<form
					method="post"
					action="/app?/moveToTrash"
					use:enhance={() => {
						return async ({ result }) => {
							if (result.type === 'success') {
								selectedCtx?.setSelected(null);
								await invalidateAll();
							}
						};
					}}
				>
					<input type="hidden" name="id" value={selectedScreenshot.id} />
					<Button type="submit" variant="outline" size="sm" class="w-full text-destructive hover:bg-destructive/10 hover:text-destructive">
						<Trash2 class="size-4" />
						Move to trash
					</Button>
				</form>
			{/if}
		</div>
	{:else}
		<div class="flex flex-1 flex-col items-center justify-center gap-4 py-12 text-center">
			<ImageIcon class="size-12 text-muted-foreground" aria-hidden="true" />
			<p class="text-muted-foreground text-sm">Select a screenshot to view details</p>
		</div>
	{/if}

	{#if isTrashPage && selectedScreenshot}
		<Dialog.Root bind:open={permanentDeleteOpen}>
			<Dialog.Content class="sm:max-w-md">
				<Dialog.Header>
					<Dialog.Title>Delete forever?</Dialog.Title>
					<Dialog.Description>
						This screenshot will be permanently removed. This action cannot be undone.
					</Dialog.Description>
				</Dialog.Header>
				<form
					method="post"
					action="/app/trash?/permanentDelete"
					use:enhance={() => {
						return async ({ result }) => {
							if (result.type === 'success') {
								permanentDeleteOpen = false;
								selectedCtx?.setSelected(null);
								await invalidateAll();
							}
						};
					}}
				>
					<input type="hidden" name="id" value={selectedScreenshot.id} />
					<Dialog.Footer class="flex-row-reverse gap-2 sm:flex-row-reverse">
						<Button type="submit" variant="destructive">
							Delete forever
						</Button>
						<Button
							type="button"
							variant="outline"
							onclick={() => (permanentDeleteOpen = false)}
						>
							Cancel
						</Button>
					</Dialog.Footer>
				</form>
			</Dialog.Content>
		</Dialog.Root>
	{/if}
</aside>
