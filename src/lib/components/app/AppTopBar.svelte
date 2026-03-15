<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { Settings, User } from '@lucide/svelte';
</script>

<header
	class="fixed inset-x-0 top-0 z-50 flex h-14 w-full shrink-0 items-center justify-between border-b border-border bg-background px-4"
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
		<Button variant="ghost" size="icon" aria-label="Profile">
			<User class="size-4" />
		</Button>
		<Button variant="ghost" size="icon" aria-label="Settings">
			<Settings class="size-4" />
		</Button>
		<form method="post" action="/app?/signOut" use:enhance>
			<Button variant="outline" size="sm" type="submit">Sign out</Button>
		</form>
	</div>
</header>
