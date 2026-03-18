<script lang="ts">
	import { deserialize } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Heart } from '@lucide/svelte';

	type Folder = { id: number; name: string; count?: number };
	type Tag = { id: number; dimension: string; label: string; sortOrder: number };


	let {
		open = false,
		previewUrl = '',
		fileName = '',
		pendingFile = null,
		uploadAction = '',
		defaultFolderId = null,
		folders = [],
		tags = [],
		onOpenChange,
		onSaveSuccess
	}: {
		open: boolean;
		previewUrl: string;
		fileName: string;
		pendingFile?: File | null;
		uploadAction: string;
		defaultFolderId?: number | null;
		folders?: Folder[];
		tags?: Tag[];
		onOpenChange?: (open: boolean) => void;
		onSaveSuccess?: () => void;
	} = $props();

	let noteText = $state('');
	let folderValue = $state<string>('');
	let createNewFolder = $state(false);
	let newFolderName = $state('');
	let selectedTagIds = $state<Set<number>>(new Set());
	let favourite = $state(false);
	let uploadResult = $state<{ success?: boolean; error?: string } | null>(null);
	let isSubmitting = $state(false);

	$effect(() => {
		if (open) {
			folderValue = defaultFolderId != null ? String(defaultFolderId) : '';
			createNewFolder = false;
			newFolderName = '';
			noteText = '';
			selectedTagIds = new Set();
			favourite = false;
			uploadResult = null;
		}
	});

	const tagsByDimension = $derived(
		(() => {
			const map: Record<string, Tag[]> = { screen: [], ui_type: [], color: [] };
			for (const t of tags) {
				if (map[t.dimension]) map[t.dimension].push(t);
			}
			return map;
		})()
	);

	function toggleTag(id: number) {
		selectedTagIds = new Set(selectedTagIds);
		if (selectedTagIds.has(id)) {
			selectedTagIds.delete(id);
		} else {
			selectedTagIds.add(id);
		}
	}

	function handleSave() {
		if (!pendingFile) return;
		uploadResult = null;
		isSubmitting = true;

		const formData = new FormData();
		formData.append('screenshot', pendingFile);
		formData.append('note', noteText.trim());
		if (createNewFolder && newFolderName.trim()) {
			formData.append('newFolderName', newFolderName.trim());
		} else if (folderValue && folderValue !== 'new') {
			formData.append('folderId', folderValue);
		}
		if (selectedTagIds.size > 0) {
			formData.append('tags', [...selectedTagIds].join(','));
		}
		if (favourite) {
			formData.append('favourite', '1');
		}

		fetch(uploadAction, { method: 'POST', body: formData })
			.then((res) => res.text())
			.then((text) => {
				const result = deserialize(text);
				const data = result.type === 'success' && 'data' in result ? result.data : undefined;
				uploadResult = (data as { success?: boolean; error?: string }) ?? {
					success: false,
					error: 'Upload failed'
				};
				if (result.type === 'success' && uploadResult?.success) {
					onOpenChange?.(false);
					onSaveSuccess?.();
					invalidateAll();
					setTimeout(() => (uploadResult = null), 3000);
				}
			})
			.catch(() => {
				uploadResult = { success: false, error: 'Upload failed' };
			})
			.finally(() => {
				isSubmitting = false;
			});
	}
</script>

<Dialog.Root
	open={open}
	onOpenChange={(o) => {
		onOpenChange?.(o);
	}}
>
	<Dialog.Content class="w-[min(24rem,calc(100vw-2rem))] max-h-[85vh] flex flex-col gap-4 overflow-hidden p-0">
		<Dialog.Header class="px-4 pt-4 pb-0">
			<Dialog.Title>Add screenshot</Dialog.Title>
			<Dialog.Description>
				Add an optional note and assign to a folder.
			</Dialog.Description>
		</Dialog.Header>
		{#if previewUrl}
			<div class="flex flex-1 flex-col gap-4 overflow-auto px-4">
				<div class="aspect-square w-full overflow-hidden rounded-lg border border-border bg-muted">
					<img
						src={previewUrl}
						alt={fileName}
						class="size-full object-cover"
					/>
				</div>

				<div class="space-y-2">
					<label for="folder-select" class="text-sm font-medium">Folder</label>
					<select
						id="folder-select"
						bind:value={folderValue}
						onchange={(e) => {
							const v = (e.target as HTMLSelectElement).value;
							folderValue = v;
							createNewFolder = v === 'new';
						}}
						class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
					>
						<option value="">Leave unassigned</option>
						{#each folders as f (f.id)}
							<option value={String(f.id)}>{f.name}</option>
						{/each}
						<option value="new">Create new folder</option>
					</select>
					{#if createNewFolder}
						<Input
							bind:value={newFolderName}
							placeholder="Folder name"
							class="w-full"
						/>
					{/if}
				</div>

				<div class="space-y-2">
					<label for="note-input" class="text-sm font-medium">Note (optional)</label>
					<Input
						id="note-input"
						bind:value={noteText}
						placeholder="Why are you saving this? (optional)"
						class="w-full"
					/>
				</div>

				<div class="space-y-2">
					<p class="text-sm font-medium">Favourite</p>
					<button
						type="button"
						onclick={() => favourite = !favourite}
						class="rounded p-1 transition-colors hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						aria-label={favourite ? 'Remove from favourites' : 'Add to favourites'}
						aria-pressed={favourite}
					>
						<Heart
							class="size-6 transition-colors {favourite
								? 'fill-primary text-primary'
								: 'text-muted-foreground/40 hover:text-muted-foreground/70'}"
						/>
					</button>
					<p class="text-xs text-muted-foreground">
						{favourite ? 'Will be added to favourites' : 'Click to favourite'}
					</p>
				</div>

				<div class="space-y-3">
					<p class="text-sm font-medium">UI Elements (optional)</p>
					{#each ['screen', 'ui_type', 'color'] as dim}
						{#if tagsByDimension[dim]?.length}
							<div class="space-y-1.5">
								<span class="text-xs text-muted-foreground capitalize">{dim === 'ui_type' ? 'UI element' : dim === 'screen' ? 'Screen' : dim}</span>
								<div class="flex flex-wrap gap-2">
									{#each tagsByDimension[dim] as t (t.id)}
										<button
											type="button"
											class="rounded-full border px-3 py-1 text-xs transition-colors {selectedTagIds.has(t.id)
												? 'border-primary bg-primary text-primary-foreground'
												: 'border-border bg-muted hover:bg-muted/80'}"
											onclick={() => toggleTag(t.id)}
										>
											{t.label}
										</button>
									{/each}
								</div>
							</div>
						{/if}
					{/each}
				</div>

				{#if uploadResult}
					<div
						class="rounded-lg px-4 py-3 text-sm {uploadResult.success
							? 'bg-green-500/10 text-green-700 dark:text-green-400'
							: 'bg-destructive/10 text-destructive'}"
						role="alert"
					>
						{uploadResult.success ? 'Screenshot uploaded successfully!' : uploadResult.error}
					</div>
				{/if}
			</div>
		{/if}
		<Dialog.Footer class="flex-row-reverse gap-2 border-t border-border px-4 py-3 sm:flex-row-reverse">
			<Button onclick={handleSave} disabled={isSubmitting || !pendingFile}>
				{isSubmitting ? 'Saving…' : 'Save'}
			</Button>
			<Button variant="outline" onclick={() => onOpenChange?.(false)}>Cancel</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
