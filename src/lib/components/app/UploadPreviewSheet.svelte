<script lang="ts">
	import { deserialize } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';

	const NOTE_MAX_LENGTH = 500;

	function getExtension(name: string, mimeType?: string): string {
		const dot = name.lastIndexOf('.');
		if (dot > 0) return name.slice(dot + 1);
		if (mimeType === 'image/png') return 'png';
		if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') return 'jpg';
		if (mimeType === 'image/webp') return 'webp';
		if (mimeType === 'image/gif') return 'gif';
		return '';
	}

	function getBaseName(name: string): string {
		const dot = name.lastIndexOf('.');
		return dot > 0 ? name.slice(0, dot) : name;
	}

	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Search, X } from '@lucide/svelte';
	import { getSectionForLabel } from '$lib/tags.js';

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
	let fileNameValue = $state('');
	let folderValue = $state<string>('');
	let createNewFolder = $state(false);
	let newFolderName = $state('');
	let selectedTagIds = $state<Set<number>>(new Set());
	let uploadResult = $state<{ success?: boolean; error?: string } | null>(null);
	let isSubmitting = $state(false);
	let uiElementsSearch = $state('');

	$effect(() => {
		if (open) {
			folderValue = defaultFolderId != null ? String(defaultFolderId) : '';
			createNewFolder = false;
			newFolderName = '';
			noteText = '';
			fileNameValue = getBaseName(fileName);
			selectedTagIds = new Set();
			uploadResult = null;
			uiElementsSearch = '';
		}
	});

	/** UI Elements only: Control, View, Overlay, Imagery (from PLANNING.md) */
	const uiElementsBySection = $derived.by(() => {
		const q = uiElementsSearch.trim().toLowerCase();
		const uiTags = tags.filter((t) => t.dimension === 'ui_type');
		const sectionMap = new Map<string, Tag[]>();
		for (const t of uiTags) {
			const section = getSectionForLabel('ui_type', t.label);
			if (section && (!q || t.label.toLowerCase().includes(q))) {
				const arr = sectionMap.get(section) ?? [];
				arr.push(t);
				sectionMap.set(section, arr);
			}
		}
		const result: { section: string; tags: Tag[] }[] = [];
		for (const section of ['Control', 'View', 'Overlay', 'Imagery']) {
			const tagsInSection = sectionMap.get(section);
			if (tagsInSection?.length) result.push({ section, tags: tagsInSection });
		}
		return result;
	});

	/** Screens: separate from UI Elements */
	const screensBySection = $derived.by(() => {
		const q = uiElementsSearch.trim().toLowerCase();
		const screenTags = tags.filter((t) => t.dimension === 'screen');
		const sectionMap = new Map<string, Tag[]>();
		for (const t of screenTags) {
			const section = getSectionForLabel('screen', t.label) ?? 'Other';
			if (!q || t.label.toLowerCase().includes(q)) {
				const arr = sectionMap.get(section) ?? [];
				arr.push(t);
				sectionMap.set(section, arr);
			}
		}
		const sectionOrder = [
			'Utility', 'Misc', 'Content', 'Actions', 'Data', 'User Collections', 'Communication',
			'Commerce & Finance', 'Social', 'New User Experience', 'Account Management', 'Other'
		];
		const result: { section: string; tags: Tag[] }[] = [];
		for (const section of sectionOrder) {
			const tagsInSection = sectionMap.get(section);
			if (tagsInSection?.length) result.push({ section, tags: tagsInSection });
		}
		return result;
	});

	const tagsByDimension = $derived(
		(() => {
			const map: Record<string, Tag[]> = { screen: [], ui_type: [], color: [], pattern: [] };
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
		formData.append('note', noteText.trim().slice(0, NOTE_MAX_LENGTH));
		if (fileNameValue.trim()) {
			const ext = getExtension(fileName, pendingFile?.type);
			const finalName = ext ? `${fileNameValue.trim()}.${ext}` : fileNameValue.trim();
			formData.append('fileName', finalName);
		}
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

<Dialog.Root
	open={open}
	onOpenChange={(o) => {
		onOpenChange?.(o);
	}}
>
	<Dialog.Content class="w-[min(32rem,calc(100vw-2rem))] max-h-[85vh] flex flex-col gap-0 overflow-hidden p-0">
		<Dialog.Header class="px-6 pt-8 pb-4">
			{#if previewUrl}
				<div class="mb-4 flex items-center gap-4">
					<div class="size-14 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
						<img
							src={previewUrl}
							alt=""
							class="size-full object-cover"
						/>
					</div>
					<div class="min-w-0 flex-1">
						<Dialog.Title class="text-2xl font-semibold tracking-tight">Add screenshot</Dialog.Title>
						<Dialog.Description class="mt-1.5 text-sm text-muted-foreground">
							Add an optional note and assign to a folder.
						</Dialog.Description>
					</div>
				</div>
			{:else}
				<Dialog.Title class="text-2xl font-semibold tracking-tight">Add screenshot</Dialog.Title>
				<Dialog.Description class="mt-1.5 text-sm text-muted-foreground">
					Add an optional note and assign to a folder.
				</Dialog.Description>
			{/if}
		</Dialog.Header>
		{#if previewUrl}
			<div class="flex flex-1 flex-col gap-6 overflow-auto px-6 pb-6">
				<div class="aspect-square w-full overflow-hidden rounded-lg bg-muted">
					<img
						src={previewUrl}
						alt={fileName}
						class="size-full object-cover"
					/>
				</div>

				<div class="space-y-2 pt-1">
					<p class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Details</p>
					<div class="space-y-3">
						<div class="space-y-2">
							<label for="fileName-input" class="block text-xs text-muted-foreground/80">File name</label>
							<div class="flex items-center gap-1 rounded-md border border-input bg-transparent shadow-sm focus-within:ring-1 focus-within:ring-ring">
								<Input
									id="fileName-input"
									bind:value={fileNameValue}
									placeholder="Screenshot name"
									class="border-0 shadow-none focus-visible:ring-0"
								/>
								{#if getExtension(fileName, pendingFile?.type)}
									<span class="shrink-0 pr-3 text-sm text-muted-foreground">.{getExtension(fileName, pendingFile?.type)}</span>
								{/if}
							</div>
						</div>
						<div class="space-y-2">
							<label for="folder-select" class="block text-xs text-muted-foreground/80">Folder</label>
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
									class="mt-1 w-full"
								/>
							{/if}
						</div>
						<div class="space-y-2">
							<label for="note-input" class="block text-xs text-muted-foreground/80">Note</label>
							<textarea
								id="note-input"
								bind:value={noteText}
								placeholder="Why are you saving this? (optional)"
								rows={5}
								maxlength={NOTE_MAX_LENGTH}
								class="flex min-h-[7.5rem] w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring break-words overflow-x-hidden"
							/>
							<p class="text-xs text-muted-foreground">{noteText.length}/{NOTE_MAX_LENGTH}</p>
						</div>
					</div>
				</div>

				<div class="space-y-3 border-t border-border pt-5">
					<p class="text-sm text-muted-foreground">Add a tag to easily find the screenshot later</p>
					<div class="relative">
						<Search
							class="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
							aria-hidden="true"
						/>
						<Input
							bind:value={uiElementsSearch}
							placeholder="Search screens, controls, views..."
							class="h-8 pl-8 pr-9 text-sm"
							aria-label="Search tags"
						/>
						{#if uiElementsSearch}
							<button
								type="button"
								onclick={() => (uiElementsSearch = '')}
								class="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
								aria-label="Clear search"
							>
								<X class="size-3.5" />
							</button>
						{/if}
					</div>
					<div class="max-h-48 overflow-y-auto space-y-4 pr-1">
						{#if uiElementsBySection.length > 0}
							<div class="space-y-3">
								<p class="text-xs font-medium uppercase tracking-wider text-muted-foreground">UI Elements</p>
								{#each uiElementsBySection as { section, tags: sectionTags }}
									<div class="space-y-2">
										<span class="block text-xs font-medium text-muted-foreground/90">{section}</span>
										<div class="flex flex-wrap gap-2">
											{#each sectionTags as t (t.id)}
												<button
													type="button"
													class="rounded-full border px-3 py-1.5 text-xs transition-colors {selectedTagIds.has(t.id)
														? 'border-primary bg-primary text-primary-foreground'
														: 'border-border bg-muted hover:bg-muted/80'}"
													onclick={() => toggleTag(t.id)}
												>
													{t.label}
												</button>
											{/each}
										</div>
									</div>
								{/each}
							</div>
						{/if}
						{#if screensBySection.length > 0}
							<div class="space-y-3 pt-5">
								<p class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Screens</p>
								{#each screensBySection as { section, tags: sectionTags }}
									<div class="space-y-2">
										<span class="block text-xs font-medium text-muted-foreground/90">{section}</span>
										<div class="flex flex-wrap gap-2">
											{#each sectionTags as t (t.id)}
												<button
													type="button"
													class="rounded-full border px-3 py-1.5 text-xs transition-colors {selectedTagIds.has(t.id)
														? 'border-primary bg-primary text-primary-foreground'
														: 'border-border bg-muted hover:bg-muted/80'}"
													onclick={() => toggleTag(t.id)}
												>
													{t.label}
												</button>
											{/each}
										</div>
									</div>
								{/each}
							</div>
						{/if}
						{#if tagsByDimension.pattern?.length}
							<div class="space-y-2">
								<p class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pattern</p>
								<div class="flex flex-wrap gap-2">
									{#each tagsByDimension.pattern.filter(
										(t) =>
											!uiElementsSearch.trim() ||
											t.label.toLowerCase().includes(uiElementsSearch.trim().toLowerCase())
									) as t (t.id)}
										<button
											type="button"
											class="rounded-full border px-3 py-1.5 text-xs transition-colors {selectedTagIds.has(t.id)
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
					</div>
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
		<Dialog.Footer class="flex-row-reverse gap-3 border-t border-border px-6 py-4 sm:flex-row-reverse">
			<Button onclick={handleSave} disabled={isSubmitting || !pendingFile}>
				{isSubmitting ? 'Saving…' : 'Save'}
			</Button>
			<Button variant="outline" onclick={() => onOpenChange?.(false)}>Cancel</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
