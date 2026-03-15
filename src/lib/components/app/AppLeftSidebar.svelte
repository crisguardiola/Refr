<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import { Folder, FolderPlus } from '@lucide/svelte';

	let { folders = [] }: { folders?: { id: number; name: string }[] } = $props();

	const isAllSelected = $derived($page.url.pathname === '/app');
	function isFolderSelected(id: number) {
		return $page.url.pathname === `/app/folder/${id}`;
	}

	let createFolderOpen = $state(false);
	let folderName = $state('');
</script>

<Sidebar.Root>
	<Sidebar.Header />
	<Sidebar.Content>
		<Sidebar.Group>
			<Sidebar.GroupLabel class="px-2 text-sm font-semibold">Folders</Sidebar.GroupLabel>
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
					</Sidebar.MenuItem>
					{#each folders as f (f.id)}
						<Sidebar.MenuItem>
							<Sidebar.MenuButton
								isActive={isFolderSelected(f.id)}
								tooltipContent={f.name}
								onclick={() => goto(`/app/folder/${f.id}`)}
							>
								<Folder class="size-4" />
								<span>{f.name}</span>
							</Sidebar.MenuButton>
						</Sidebar.MenuItem>
					{/each}
				</Sidebar.Menu>
				<div class="flex flex-col items-center justify-center gap-4 px-4 py-6 text-center">
					<Button
						variant="outline"
						size="sm"
						onclick={() => {
							folderName = '';
							createFolderOpen = true;
						}}
					>
						<FolderPlus class="size-4" />
						Create folder
					</Button>
				</div>
			</Sidebar.GroupContent>
		</Sidebar.Group>
	</Sidebar.Content>
</Sidebar.Root>

<Sheet.Root
	bind:open={createFolderOpen}
	onOpenChange={(open) => {
		if (!open) folderName = '';
	}}
>
	<Sheet.Content side="bottom" class="max-h-[85vh] flex flex-col">
		<Sheet.Header>
			<Sheet.Title>Create folder</Sheet.Title>
			<Sheet.Description>Give your folder a name to organise your screenshots.</Sheet.Description>
		</Sheet.Header>
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
			class="flex flex-1 flex-col gap-4 overflow-auto px-4"
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
			<Sheet.Footer class="flex-row-reverse gap-2 sm:flex-row-reverse">
				<Button type="submit">Create</Button>
				<Button
					type="button"
					variant="outline"
					onclick={() => (createFolderOpen = false)}
				>
					Cancel
				</Button>
			</Sheet.Footer>
		</form>
	</Sheet.Content>
</Sheet.Root>
