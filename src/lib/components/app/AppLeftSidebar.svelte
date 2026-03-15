<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Folder, FolderPlus } from '@lucide/svelte';

	const isAllSelected = $derived($page.url.pathname === '/app');
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
				</Sidebar.Menu>
				<div class="flex flex-col items-center justify-center gap-4 px-4 py-6 text-center">
					<Button variant="outline" size="sm" disabled>
						<FolderPlus class="size-4" />
						Create folder
					</Button>
				</div>
			</Sidebar.GroupContent>
		</Sidebar.Group>
	</Sidebar.Content>
</Sidebar.Root>
