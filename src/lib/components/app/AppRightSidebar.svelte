<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { getContext } from 'svelte';
	import { cn } from '$lib/utils.js';
	import { cloudinaryUrl } from '$lib/cloudinary.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { ImageIcon, Trash2 } from '@lucide/svelte';

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

	let isEditing = $state(false);
	let editFolderId = $state<string>('');
	let editTagIds = $state<Set<number>>(new Set());

	$effect(() => {
		if (selectedScreenshot) {
			editFolderId = selectedScreenshot.folder?.id != null ? String(selectedScreenshot.folder.id) : '';
			editTagIds = new Set((selectedScreenshot.tags ?? []).map((t) => t.id));
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

	const tagsByDimension = $derived(
		(() => {
			const map: Record<string, Tag[]> = { ui_type: [], color: [], pattern: [] };
			for (const t of tags) {
				if (map[t.dimension]) map[t.dimension].push(t);
			}
			return map;
		})()
	);

	function toggleEditTag(id: number) {
		editTagIds = new Set(editTagIds);
		if (editTagIds.has(id)) {
			editTagIds.delete(id);
		} else {
			editTagIds.add(id);
		}
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
					<dd class="mt-0.5 font-medium">
						{#if isEditing}
							<select
								bind:value={editFolderId}
								class="flex h-8 w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm"
							>
								<option value="">Uncategorised</option>
								{#each folders as f (f.id)}
									<option value={String(f.id)}>{f.name}</option>
								{/each}
							</select>
						{:else}
							{#if selectedScreenshot.folder}
								<a
									href="/app/folder/{selectedScreenshot.folder.id}"
									class="text-primary hover:underline"
									onclick={(e) => {
										e.preventDefault();
										const fid = selectedScreenshot.folder?.id;
										if (fid != null) goto(`/app/folder/${fid}`);
									}}
								>
									{selectedScreenshot.folder.name}
								</a>
							{:else}
								<span class="text-muted-foreground">Uncategorised</span>
							{/if}
						{/if}
					</dd>
				</div>
				<div>
					<dt class="text-muted-foreground">Tags</dt>
					<dd class="mt-0.5">
						{#if isEditing}
							<div class="space-y-2">
								{#each ['ui_type', 'color', 'pattern'] as dim}
									{#if tagsByDimension[dim]?.length}
										<div class="space-y-1">
											<span class="text-xs text-muted-foreground capitalize">{dim.replace('_', ' ')}</span>
											<div class="flex flex-wrap gap-1">
												{#each tagsByDimension[dim] as t (t.id)}
													<button
														type="button"
														class="rounded-full border px-2 py-0.5 text-xs transition-colors {editTagIds.has(t.id)
															? 'border-primary bg-primary text-primary-foreground'
															: 'border-border bg-muted hover:bg-muted/80'}"
														onclick={() => toggleEditTag(t.id)}
													>
														{t.label}
													</button>
												{/each}
											</div>
										</div>
									{/if}
								{/each}
							</div>
						{:else}
							{#if selectedScreenshot.tags?.length}
								<div class="flex flex-wrap gap-1">
									{#each selectedScreenshot.tags as t (t.id)}
										<span
											class="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs"
										>
											{t.label}
										</span>
									{/each}
								</div>
							{:else}
								<span class="text-muted-foreground">No tags</span>
							{/if}
						{/if}
					</dd>
				</div>
			</dl>
			{#if isEditing}
				<form
					method="post"
					action="/app?/updateScreenshot"
					use:enhance={() => {
						return async ({ result }) => {
							if (result.type === 'success') {
								isEditing = false;
								await invalidateAll();
							}
						};
					}}
					class="flex flex-col gap-2"
				>
					<input type="hidden" name="id" value={selectedScreenshot.id} />
					<input type="hidden" name="folderId" value={editFolderId} />
					<input type="hidden" name="tags" value={[...editTagIds].join(',')} />
					<Button type="submit" size="sm">Save changes</Button>
					<Button type="button" variant="outline" size="sm" onclick={() => (isEditing = false)}>
						Cancel
					</Button>
				</form>
			{:else}
				<Button variant="outline" size="sm" onclick={() => (isEditing = true)}>Edit</Button>
				{#if $page.url.pathname === '/app/trash'}
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
			{/if}
		</div>
	{:else}
		<div class="flex flex-1 flex-col items-center justify-center gap-4 py-12 text-center">
			<ImageIcon class="size-12 text-muted-foreground" aria-hidden="true" />
			<p class="text-muted-foreground text-sm">Select a screenshot to view details</p>
		</div>
	{/if}
</aside>
