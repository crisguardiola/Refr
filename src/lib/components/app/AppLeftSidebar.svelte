<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { SCREENSHOT_DRAG_TYPE } from '$lib/move-screenshot.js';
	import { moveScreenshot } from '$lib/move-screenshot.js';
	import { Folder, FolderOpen, FolderPlus, Heart, Trash2 } from '@lucide/svelte';

	let {
		folders = [],
		counts = { all: 0, uncategorised: 0, favourites: 0, trash: 0 }
	}: {
		folders?: { id: number; name: string; count: number }[];
		counts?: { all: number; uncategorised: number; favourites: number; trash: number };
	} = $props();

	const isAllSelected = $derived($page.url.pathname === '/app');
	const isUncategorisedSelected = $derived($page.url.pathname === '/app/uncategorised');
	const isFavouritesSelected = $derived($page.url.pathname === '/app/favourites');
	const isTrashSelected = $derived($page.url.pathname === '/app/trash');
	function isFolderSelected(id: number) {
		return $page.url.pathname === `/app/folder/${id}`;
	}

	let createFolderOpen = $state(false);
	let folderName = $state('');
	let dropTarget = $state<'uncategorised' | 'trash' | number | null>(null);

	function handleFolderDragOver(e: DragEvent, target: 'uncategorised' | 'trash' | number) {
		if (e.dataTransfer?.types.includes(SCREENSHOT_DRAG_TYPE)) {
			e.preventDefault();
			e.dataTransfer.dropEffect = 'move';
			dropTarget = target;
		}
	}

	function handleFolderDragLeave() {
		dropTarget = null;
	}

	async function handleFolderDrop(
		e: DragEvent,
		target: 'uncategorised' | 'trash' | number
	) {
		if (!e.dataTransfer?.types.includes(SCREENSHOT_DRAG_TYPE)) return;
		e.preventDefault();
		e.stopPropagation();
		const raw = e.dataTransfer.getData(SCREENSHOT_DRAG_TYPE);
		if (!raw) return;
		let data: { screenshotId: number; tagIds: number[] };
		try {
			data = JSON.parse(raw);
		} catch {
			return;
		}
		const ok = await moveScreenshot(data.screenshotId, target, data.tagIds);
		if (ok) await invalidateAll();
		dropTarget = null;
	}

	const dropTargetClass = 'ring-2 ring-primary ring-offset-2 bg-primary/15 border border-primary/50';
</script>

<Sidebar.Root variant="floating">
	<Sidebar.Header />
	<Sidebar.Content>
		<Sidebar.Group>
			<Sidebar.GroupContent>
				<Sidebar.Menu>
					<Sidebar.MenuItem>
						<Sidebar.MenuButton
							isActive={isAllSelected}
							tooltipContent="All"
							onclick={() => goto('/app')}
						>
							<Folder class="size-4" />
							<span>All</span>
						</Sidebar.MenuButton>
						<Sidebar.MenuBadge>{counts.all}</Sidebar.MenuBadge>
					</Sidebar.MenuItem>
					<Sidebar.MenuItem>
						<Sidebar.MenuButton
							isActive={isUncategorisedSelected}
							tooltipContent="Uncategorised"
							class={dropTarget === 'uncategorised' ? dropTargetClass : ''}
							onclick={() => goto('/app/uncategorised')}
							ondragover={(e) => handleFolderDragOver(e, 'uncategorised')}
							ondragleave={handleFolderDragLeave}
							ondrop={(e) => handleFolderDrop(e, 'uncategorised')}
						>
							<FolderOpen class="size-4" />
							<span>Uncategorised</span>
						</Sidebar.MenuButton>
						<Sidebar.MenuBadge>{counts.uncategorised}</Sidebar.MenuBadge>
					</Sidebar.MenuItem>
					<Sidebar.MenuItem>
						<Sidebar.MenuButton
							isActive={isFavouritesSelected}
							tooltipContent="Favourites"
							onclick={() => goto('/app/favourites')}
						>
							<Heart class="size-4" />
							<span>Favourites</span>
						</Sidebar.MenuButton>
						<Sidebar.MenuBadge>{counts.favourites ?? 0}</Sidebar.MenuBadge>
					</Sidebar.MenuItem>
					<Sidebar.MenuItem>
						<Sidebar.MenuButton
							isActive={isTrashSelected}
							tooltipContent="Trash"
							class={dropTarget === 'trash' ? dropTargetClass : ''}
							onclick={() => goto('/app/trash')}
							ondragover={(e) => handleFolderDragOver(e, 'trash')}
							ondragleave={handleFolderDragLeave}
							ondrop={(e) => handleFolderDrop(e, 'trash')}
						>
							<Trash2 class="size-4" />
							<span>Trash</span>
						</Sidebar.MenuButton>
						<Sidebar.MenuBadge>{counts.trash}</Sidebar.MenuBadge>
					</Sidebar.MenuItem>
				</Sidebar.Menu>
			</Sidebar.GroupContent>
		</Sidebar.Group>

		<Sidebar.Separator />

		<Sidebar.Group>
			<div class="flex h-8 shrink-0 items-center justify-between gap-2 px-2">
				<span class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Folders</span>
				<Dialog.Root
					bind:open={createFolderOpen}
					onOpenChange={(isOpen) => {
						if (!isOpen) folderName = '';
					}}
				>
					<Button
						variant="default"
						size="icon"
						class="size-8 shrink-0"
						aria-label="Create folder"
						onclick={() => (createFolderOpen = true)}
					>
						<FolderPlus class="size-4" />
					</Button>
						<Dialog.Content class="w-80 max-w-[calc(100%-2rem)]">
							<Dialog.Header>
								<Dialog.Title>Create folder</Dialog.Title>
								<Dialog.Description>
									Give your folder a name to organise your screenshots.
								</Dialog.Description>
							</Dialog.Header>
							<form
								method="post"
								action="/app?/createFolder"
								use:enhance={() => {
									return async ({ result }) => {
										if (result.type === 'redirect') {
											createFolderOpen = false;
											await invalidateAll();
										}
									};
								}}
								class="flex flex-col gap-4"
							>
								<div class="space-y-2">
									<label for="folder-name" class="text-sm font-medium">Folder name</label>
									<Input
										id="folder-name"
										name="name"
										bind:value={folderName}
										placeholder="e.g. UI inspiration"
										class="w-full"
										required
									/>
								</div>
								<Dialog.Footer class="flex-row-reverse gap-2 sm:flex-row-reverse">
									<Button type="submit">Create</Button>
									<Button
										type="button"
										variant="outline"
										onclick={() => (createFolderOpen = false)}
									>
										Cancel
									</Button>
								</Dialog.Footer>
							</form>
						</Dialog.Content>
				</Dialog.Root>
			</div>
			<Sidebar.GroupContent>
				<Sidebar.Menu>
					{#each folders as f (f.id)}
						<Sidebar.MenuItem>
							<Sidebar.MenuButton
								isActive={isFolderSelected(f.id)}
								tooltipContent={f.name}
								class={dropTarget === f.id ? dropTargetClass : ''}
								onclick={() => goto(`/app/folder/${f.id}`)}
								ondragover={(e) => handleFolderDragOver(e, f.id)}
								ondragleave={handleFolderDragLeave}
								ondrop={(e) => handleFolderDrop(e, f.id)}
							>
								<Folder class="size-4" />
								<span>{f.name}</span>
							</Sidebar.MenuButton>
							<Sidebar.MenuBadge>{f.count ?? 0}</Sidebar.MenuBadge>
						</Sidebar.MenuItem>
					{/each}
				</Sidebar.Menu>
			</Sidebar.GroupContent>
		</Sidebar.Group>
	</Sidebar.Content>
</Sidebar.Root>
