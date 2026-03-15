<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import { getContext } from 'svelte';
	import { cn } from '$lib/utils.js';
	import { cloudinaryUrl } from '$lib/cloudinary.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { ImageIcon, Trash2, Plus, X } from '@lucide/svelte';

	type Folder = { id: number; name: string; count?: number };
	type Tag = { id: number; dimension: string; label: string; sortOrder: number };

	let {
		selectedScreenshot = null,
		folders = [],
		tags = []
	}: {
		selectedScreenshot?: {
			id: number;
			url: string;
			fileName: string;
			note?: string | null;
			createdAt: Date | string;
			folder?: { id: number; name: string } | null;
			tags?: Tag[];
		} | null;
		folders?: Folder[];
		tags?: Tag[];
	} = $props();

	const selectedCtx = getContext<{
		setSelected: (s: { id: number } | null) => void;
	}>('selectedScreenshot');

	let folderId = $state<string>('');
	let addTagOpen = $state(false);
	let isSaving = $state(false);
	let addTagRef: HTMLDivElement;

	$effect(() => {
		if (!addTagOpen) return;
		const handler = (e: MouseEvent) => {
			if (addTagRef && !addTagRef.contains(e.target as Node)) {
				addTagOpen = false;
			}
		};
		const t = setTimeout(() => document.addEventListener('click', handler), 0);
		return () => {
			clearTimeout(t);
			document.removeEventListener('click', handler);
		};
	});

	$effect(() => {
		if (selectedScreenshot) {
			folderId = selectedScreenshot.folder?.id != null ? String(selectedScreenshot.folder.id) : '';
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

	const isTrashPage = $derived($page?.url?.pathname === '/app/trash');

	async function updateScreenshot(payload: { folderId: string; tagIds: number[] }) {
		if (!selectedScreenshot || isSaving) return;
		isSaving = true;
		const formData = new FormData();
		formData.append('id', String(selectedScreenshot.id));
		formData.append('folderId', payload.folderId);
		formData.append('tags', payload.tagIds.join(','));
		try {
			const res = await fetch('/app?/updateScreenshot', { method: 'POST', body: formData });
			const text = await res.text();
			if (res.ok) {
				await invalidateAll();
			}
		} finally {
			isSaving = false;
		}
	}

	function handleFolderChange(e: Event) {
		const v = (e.target as HTMLSelectElement).value;
		folderId = v;
		updateScreenshot({ folderId: v, tagIds: [...selectedTagIds] });
	}

	function removeTag(tagId: number) {
		const next = [...selectedTagIds].filter((id) => id !== tagId);
		updateScreenshot({ folderId, tagIds: next });
	}

	function addTag(tagId: number) {
		addTagOpen = false;
		const next = [...selectedTagIds, tagId];
		updateScreenshot({ folderId, tagIds: next });
	}
</script>

<aside
	class={cn(
		'flex w-64 shrink-0 flex-col overflow-auto border-s border-border bg-background p-4',
		'sm:w-72 lg:w-80'
	)}
	data-slot="app-right-sidebar"
>
	{#if selectedScreenshot}
		<div class="flex flex-col gap-6">
			<div class="space-y-2">
				<h3 class="text-sm font-semibold">Details</h3>
				<img
					src={cloudinaryUrl(selectedScreenshot.url, 'sidebar')}
					alt={selectedScreenshot.fileName}
					class="w-1/3 rounded-lg border border-border object-cover"
				/>
			</div>
			<dl class="space-y-3 text-sm">
				<div>
					<dt class="text-muted-foreground">File name</dt>
					<dd class="mt-0.5 font-medium">{selectedScreenshot.fileName}</dd>
				</div>
				<div>
					<dt class="text-muted-foreground">Added</dt>
					<dd class="mt-0.5 font-medium">{formattedDate}</dd>
				</div>
				{#if selectedScreenshot.note}
					<div>
						<dt class="text-muted-foreground">Note</dt>
						<dd class="mt-0.5 font-medium">{selectedScreenshot.note}</dd>
					</div>
				{/if}
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
					<dt class="text-muted-foreground">Tags</dt>
					<dd class="mt-0.5">
						<div class="flex flex-wrap items-center gap-1.5">
							{#each selectedScreenshot.tags ?? [] as t (t.id)}
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
							<div class="relative" bind:this={addTagRef}>
								<button
									type="button"
									onclick={(e) => {
										e.stopPropagation();
										addTagOpen = !addTagOpen;
									}}
									disabled={isSaving}
									class="inline-flex items-center justify-center rounded-full border border-dashed border-muted-foreground/40 p-1 hover:border-muted-foreground/60 hover:bg-muted/50 transition-colors"
									aria-label="Add tag"
								>
									<Plus class="size-3.5 text-muted-foreground" />
								</button>
								{#if addTagOpen}
									<div
										class="absolute left-0 top-full z-50 mt-1 max-h-48 w-64 overflow-auto rounded-md border border-border bg-background py-1 shadow-lg"
										role="listbox"
									>
										{#if availableToAdd.length === 0}
											<p class="px-3 py-2 text-xs text-muted-foreground">All tags added</p>
										{:else}
											{#each availableToAdd as t (t.id)}
												<button
													type="button"
													role="option"
													aria-selected="false"
													onclick={() => addTag(t.id)}
													class="block w-full px-3 py-1.5 text-left text-sm hover:bg-muted"
												>
													{t.label}
													<span class="text-muted-foreground text-xs"> — {t.dimension === 'ui_type' ? 'UI element' : t.dimension}</span>
												</button>
											{/each}
										{/if}
									</div>
								{/if}
							</div>
						</div>
						{#if (selectedScreenshot.tags?.length ?? 0) === 0 && !addTagOpen}
							<p class="mt-1 text-xs text-muted-foreground">No tags. Click + to add.</p>
						{/if}
					</dd>
				</div>
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
					<form
						method="post"
						action="/app/trash?/permanentDelete"
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
							Delete permanently
						</Button>
					</form>
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
</aside>
