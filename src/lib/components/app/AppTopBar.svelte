<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import BugReportDialog from '$lib/components/app/BugReportDialog.svelte';
	import { theme } from '$lib/theme.js';
	import { Bug, LogOut, Moon, Sun, User } from '@lucide/svelte';

	let { user, canViewBugs = false }: { user: { name: string }; canViewBugs?: boolean } = $props();
	let bugDialogOpen = $state(false);
</script>

<header
	class="fixed inset-x-0 top-0 z-50 flex h-14 w-full shrink-0 items-center justify-between px-4 border-b border-border bg-background"
	data-slot="app-topbar"
>
	<div class="flex items-center gap-2">
		<Sidebar.Trigger
			class="md:hidden"
			aria-label="Toggle folders"
		/>
		<a href="/app" class="text-lg font-semibold">Refr</a>
	</div>
	<div class="flex items-center gap-2">
		<button
			type="button"
			class="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
			aria-label="Report a bug"
			onclick={() => (bugDialogOpen = true)}
		>
			<Bug class="size-4" />
		</button>
		<button
			type="button"
			class="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
			aria-label="Toggle dark mode"
			onclick={() => theme.toggle()}
		>
			<Sun class="size-4 dark:hidden" />
			<Moon class="size-4 hidden dark:block" />
		</button>
		<Popover.Root>
			<Popover.Trigger
				class="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
				aria-label="Profile"
			>
				<User class="size-4" />
			</Popover.Trigger>
			<Popover.Portal>
				<Popover.Content align="end" side="bottom" class="w-56 p-2">
					<div class="px-2 py-2">
						<p class="text-sm font-medium">{user?.name ?? 'User'}</p>
					</div>
					<form method="post" action="/app?/signOut" use:enhance>
						<Button
							variant="ghost"
							size="sm"
							type="submit"
							class="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
						>
							<LogOut class="size-4" />
							Sign out
						</Button>
					</form>
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
		<BugReportDialog open={bugDialogOpen} onOpenChange={(o) => (bugDialogOpen = o)} {canViewBugs} />
	</div>
</header>
