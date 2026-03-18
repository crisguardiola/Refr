<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Bug, ImagePlus } from '@lucide/svelte';

	let {
		open = false,
		onOpenChange,
		canViewBugs = false
	}: {
		open: boolean;
		onOpenChange?: (open: boolean) => void;
		canViewBugs?: boolean;
	} = $props();

	let reportResult = $state<{ success?: boolean; error?: string } | null>(null);
	let imagePreviewUrl = $state<string | null>(null);
	let fileInputRef: HTMLInputElement | undefined;

	$effect(() => {
		if (!open) {
			if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
			imagePreviewUrl = null;
		}
	});

	function handleFileChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file && file.type.startsWith('image/')) {
			if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
			imagePreviewUrl = URL.createObjectURL(file);
		} else {
			imagePreviewUrl = null;
		}
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		const file = e.dataTransfer?.files?.[0];
		if (file && file.type.startsWith('image/') && fileInputRef) {
			if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
			imagePreviewUrl = URL.createObjectURL(file);
			const dt = new DataTransfer();
			dt.items.add(file);
			fileInputRef.files = dt.files;
		}
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
	}

	function handleEnhance() {
		return async ({
			result,
			update
		}: {
			result: { type: string; data?: { success?: boolean; error?: string } };
			update: (opts?: { reset?: boolean; invalidateAll?: boolean }) => Promise<void>;
		}) => {
			if (result.type === 'success' && result.data) {
				reportResult = result.data;
				if (reportResult.success) {
					onOpenChange?.(false);
					invalidateAll();
					setTimeout(() => (reportResult = null), 3000);
				}
				await update({ reset: !reportResult.success, invalidateAll: !!reportResult.success });
			} else {
				await update();
			}
		};
	}
</script>

<Dialog.Root
	open={open}
	onOpenChange={(o) => {
		onOpenChange?.(o);
		if (!o) reportResult = null;
	}}
>
	<Dialog.Content class="w-[min(28rem,calc(100vw-2rem))] max-h-[85vh] flex flex-col overflow-hidden p-0">
		<Dialog.Header class="px-6 pt-6 pb-4">
			<Dialog.Title class="flex items-center gap-2 text-xl font-semibold tracking-tight">
				<Bug class="size-5 text-muted-foreground" />
				Report a bug
			</Dialog.Title>
			<Dialog.Description class="mt-1.5 text-sm text-muted-foreground">
				Describe the issue you encountered. Reporter name and screenshot are optional.
				{#if canViewBugs}
					<a href="/app/bugs" class="text-primary underline underline-offset-2 hover:no-underline ml-1">View bugs</a>
				{/if}
			</Dialog.Description>
		</Dialog.Header>
		<form
			method="post"
			action="/app/bugs?/report"
			enctype="multipart/form-data"
			use:enhance={handleEnhance}
			class="flex flex-1 flex-col gap-4 overflow-auto px-6 pb-6"
		>
			<div class="space-y-2">
				<label for="bug-note" class="block text-sm font-medium">Note <span class="text-destructive">*</span></label>
				<textarea
					id="bug-note"
					name="note"
					required
					rows="4"
					placeholder="Describe the bug..."
					class="flex w-full min-h-[6rem] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
				></textarea>
			</div>
			<div class="space-y-2">
				<label for="bug-reporter" class="block text-sm font-medium text-muted-foreground">Reporter name (optional)</label>
				<Input
					id="bug-reporter"
					name="reporterName"
					type="text"
					placeholder="Your name"
					class="w-full"
				/>
			</div>
			<div class="space-y-2">
				<label for="bug-image" class="block text-sm font-medium text-muted-foreground">Screenshot (optional)</label>
				<div
					role="button"
					tabindex="0"
					class="relative flex min-h-[14rem] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-input bg-muted/30 transition-colors hover:border-primary/50 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					onclick={() => fileInputRef?.click()}
					onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), fileInputRef?.click())}
					ondragover={handleDragOver}
					ondragleave={handleDragOver}
					ondrop={handleDrop}
				>
					<input
						bind:this={fileInputRef}
						id="bug-image"
						name="image"
						type="file"
						accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
						class="sr-only"
						onchange={handleFileChange}
					/>
					{#if imagePreviewUrl}
						<img
							src={imagePreviewUrl}
							alt="Screenshot preview"
							class="max-h-48 w-auto max-w-full rounded object-contain"
						/>
						<span class="text-xs text-muted-foreground">Click or drop to replace</span>
					{:else}
						<ImagePlus class="size-10 text-muted-foreground" />
						<span class="text-sm font-medium text-muted-foreground">Choose file</span>
						<span class="text-xs text-muted-foreground">PNG, JPEG, WebP or GIF</span>
					{/if}
				</div>
			</div>
			{#if reportResult}
				<div
					class="rounded-md px-3 py-2 text-sm {reportResult.success
						? 'bg-green-500/10 text-green-600 dark:text-green-400'
						: 'bg-destructive/10 text-destructive'}"
				>
					{reportResult.success ? 'Bug reported successfully!' : reportResult.error}
				</div>
			{/if}
			<Dialog.Footer class="flex flex-row justify-end gap-2 pt-2">
				<Button
					type="button"
					variant="outline"
					onclick={() => onOpenChange?.(false)}
				>
					Cancel
				</Button>
				<Button type="submit">Submit</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
