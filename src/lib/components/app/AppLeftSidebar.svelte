<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { FolderPlus } from '@lucide/svelte';
</script>

<Sidebar.Root>
	<Sidebar.Header />
	<Sidebar.Content>
		<Sidebar.Group>
			<Sidebar.GroupLabel class="px-2 text-sm font-semibold">Folders</Sidebar.GroupLabel>
			<Sidebar.GroupContent>
			<div class="flex flex-col items-center justify-center gap-4 px-4 py-8 text-center">
				<p class="text-muted-foreground text-sm">No folders yet</p>
				<Button variant="outline" size="sm" disabled>
					<FolderPlus class="size-4" />
					Create folder
				</Button>
			</div>
			</Sidebar.GroupContent>
		</Sidebar.Group>
	</Sidebar.Content>
</Sidebar.Root>
