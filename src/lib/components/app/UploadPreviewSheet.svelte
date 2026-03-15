<script lang="ts">
	import { deserialize } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Sheet from '$lib/components/ui/sheet/index.js';

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
	let uploadResult = $state<{ success?: boolean; error?: string } | null>(null);
	let isSubmitting = $state(false);

	$effect(() => {
		if (open) {
			folderValue = defaultFolderId != null ? String(defaultFolderId) : '';
			createNewFolder = false;
			newFolderName = '';
			noteText = '';
			selectedTagIds = new Set();
			uploadResult = null;
		}
	});

	const tagsByDimension = $derived(
		(() => {
			const map: Record<string, Tag[]> = { ui_type: [], color: [], pattern: [] };
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

<Sheet.Root
	open={open}
	onOpenChange={(o) => {
		onOpenChange?.(o);
	}}
>
	<Sheet.Content side="bottom" class="max-h-[85vh] flex flex-col">
		<Sheet.Header>
			<Sheet.Title>Add screenshot</Sheet.Title>
			<Sheet.Description>Add an optional note and assign to a folder.</Sheet.Description>
		</Sheet.Header>
		{#if previewUrl}
			<div class="flex flex-1 flex-col gap-4 overflow-auto px-4">
				<img
					src={previewUrl}
					alt={fileName}
					class="max-h-48 w-full rounded-lg border border-border object-contain bg-muted"
				/>

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

				<div class="space-y-3">
					<p class="text-sm font-medium">Tags (optional)</p>
					{#each ['ui_type', 'color', 'pattern'] as dim}
						{#if tagsByDimension[dim]?.length}
							<div class="space-y-1.5">
								<span class="text-xs text-muted-foreground capitalize">{dim.replace('_', ' ')}</span>
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
		<Sheet.Footer class="flex-row-reverse gap-2 sm:flex-row-reverse">
			<Button onclick={handleSave} disabled={isSubmitting || !pendingFile}>
				{isSubmitting ? 'Saving…' : 'Save'}
			</Button>
			<Button variant="outline" onclick={() => onOpenChange?.(false)}>Cancel</Button>
		</Sheet.Footer>
	</Sheet.Content>
</Sheet.Root>
