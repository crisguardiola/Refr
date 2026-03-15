<script lang="ts">
	import { setContext } from 'svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import AppTopBar from '$lib/components/app/AppTopBar.svelte';
	import AppLeftSidebar from '$lib/components/app/AppLeftSidebar.svelte';
	import AppCenterArea from '$lib/components/app/AppCenterArea.svelte';
	import AppRightSidebar from '$lib/components/app/AppRightSidebar.svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	type Screenshot = {
		id: number;
		url: string;
		fileName: string;
		note?: string | null;
		createdAt: Date;
	};

	let selectedScreenshot = $state<Screenshot | null>(null);

	setContext('selectedScreenshot', {
		get selected() {
			return selectedScreenshot;
		},
		setSelected(s: Screenshot | null) {
			selectedScreenshot = s;
		}
	});
</script>

<Sidebar.Provider>
	<div class="app-layout flex min-h-svh w-full flex-col">
		<AppTopBar />
		<div class="flex min-h-0 flex-1 pt-14">
			<AppLeftSidebar
				folders={data.folders ?? []}
				counts={data.counts ?? { all: 0, uncategorised: 0, trash: 0 }}
			/>
			<Sidebar.Inset>
				<div class="flex h-full flex-col overflow-hidden">
					<div class="flex min-h-0 flex-1">
						<AppCenterArea>
							{@render children?.()}
						</AppCenterArea>
						<AppRightSidebar selectedScreenshot={selectedScreenshot} />
					</div>
				</div>
			</Sidebar.Inset>
		</div>
	</div>
</Sidebar.Provider>
