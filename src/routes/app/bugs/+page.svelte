<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { cloudinaryUrl } from '$lib/cloudinary.js';
	import { Bug, Trash2 } from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let deleteBugId = $state<number | null>(null);

	type BugReport = {
		id: number;
		note: string;
		reporterName: string | null;
		imageUrl: string | null;
		createdAt: Date | string;
		reporterEmail?: string | null;
	};

	const bugs = $derived((data.bugs ?? []) as BugReport[]);
	const isEmpty = $derived(bugs.length === 0);

	function formatDate(d: Date | string): string {
		return new Date(d).toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<div class="flex flex-1 flex-col gap-6">
	<div class="flex flex-col gap-2 min-w-0">
		<h1 class="text-2xl font-semibold tracking-tight flex items-center gap-2">
			<Bug class="size-6 text-muted-foreground" />
			Bug reports
		</h1>
		<p class="text-sm text-muted-foreground">
			{#if data.isAdmin}
				All reported bugs from users. Use the bug icon in the top bar to report a new one.
			{:else}
				Your reported bugs. Use the bug icon in the top bar to report a new one.
			{/if}
		</p>
	</div>

	{#if isEmpty}
		<div class="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border py-16 text-center">
			<Bug class="size-12 text-muted-foreground/50" />
			<p class="text-sm text-muted-foreground">No bug reports yet</p>
			<p class="text-xs text-muted-foreground">Click the bug icon in the top navigation to report one</p>
		</div>
	{:else}
		<div class="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
			{#each bugs as b (b.id)}
				<Card.Root class="overflow-hidden">
					<div class="flex flex-col sm:flex-row gap-4 p-4">
						{#if b.imageUrl}
							<div class="shrink-0">
								<a
									href={cloudinaryUrl(b.imageUrl, 'detail')}
									target="_blank"
									rel="noopener noreferrer"
									class="block aspect-video w-full sm:w-40 overflow-hidden rounded-md bg-muted"
								>
									<img
										src={cloudinaryUrl(b.imageUrl, 'thumbnail')}
										alt="Bug screenshot"
										class="size-full object-cover hover:opacity-90 transition-opacity"
									/>
								</a>
							</div>
						{/if}
						<div class="min-w-0 flex-1 flex flex-col gap-2">
							<div class="flex items-start justify-between gap-2">
								<p class="text-sm font-medium whitespace-pre-wrap flex-1 min-w-0">{b.note}</p>
								{#if data.isAdmin}
									<Button
										type="button"
										variant="ghost"
										size="icon"
										class="size-8 text-muted-foreground hover:text-destructive"
										aria-label="Delete bug"
										onclick={() => (deleteBugId = b.id)}
									>
										<Trash2 class="size-4" />
									</Button>
								{/if}
							</div>
							<div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-auto">
								{#if data.isAdmin && b.reporterEmail}
									<span>{b.reporterEmail}</span>
									<span>·</span>
								{:else if b.reporterName}
									<span>{b.reporterName}</span>
									<span>·</span>
								{/if}
								<span>{formatDate(b.createdAt)}</span>
							</div>
						</div>
					</div>
				</Card.Root>
			{/each}
		</div>
	{/if}
</div>

{#if data.isAdmin}
	<Dialog.Root
		open={deleteBugId !== null}
		onOpenChange={(o) => {
			if (!o) deleteBugId = null;
		}}
	>
		<Dialog.Content class="sm:max-w-md">
			<Dialog.Header>
				<Dialog.Title>Delete bug report?</Dialog.Title>
				<Dialog.Description>
					This will permanently delete this bug report. This cannot be undone.
				</Dialog.Description>
			</Dialog.Header>
			{#if deleteBugId}
				<form
					method="post"
					action="/app/bugs?/deleteBug"
					use:enhance={() => {
						return async ({ result }) => {
							if (result.type === 'success' && result.data?.success) {
								deleteBugId = null;
								await invalidateAll();
							}
						};
					}}
					class="flex justify-end gap-2 pt-4"
				>
					<input type="hidden" name="bugId" value={deleteBugId} />
					<Button type="button" variant="outline" onclick={() => (deleteBugId = null)}>
						Cancel
					</Button>
					<Button type="submit" variant="destructive">Delete</Button>
				</form>
			{/if}
		</Dialog.Content>
	</Dialog.Root>
{/if}
