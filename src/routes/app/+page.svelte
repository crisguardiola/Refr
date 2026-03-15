<script lang="ts">
	import { deserialize } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import { ImageIcon, Upload } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const uploadAction = $derived($page.url.pathname + '?/uploadScreenshot');

	let isDragging = $state(false);
	let fileInput: HTMLInputElement;
	let uploadResult = $state<{ success?: boolean; error?: string } | null>(null);

	const ACCEPT = 'image/png,image/jpeg,image/jpg,image/webp,image/gif';

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		if (e.dataTransfer?.types.includes('Files')) {
			isDragging = true;
		}
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		isDragging = false;
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		isDragging = false;

		const files = e.dataTransfer?.files;
		if (!files?.length) return;

		const imageFile = Array.from(files).find((f) =>
			['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'].includes(f.type)
		);
		if (imageFile) {
			submitFile(imageFile);
		}
	}

	function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) {
			submitFile(file);
			input.value = '';
		}
	}

	function submitFile(file: File) {
		uploadResult = null;
		const formData = new FormData();
		formData.append('screenshot', file);

		fetch(uploadAction, {
			method: 'POST',
			body: formData
		})
			.then((res) => res.text())
			.then((text) => {
				const result = deserialize(text);
				uploadResult = (result.data as { success?: boolean; error?: string }) ?? {
					success: false,
					error: 'Upload failed'
				};
				if (result.type === 'success' && uploadResult?.success) {
					invalidateAll();
				}
			})
			.catch(() => {
				uploadResult = { success: false, error: 'Upload failed' };
			});
	}

	const screenshots = data.screenshots ?? [];
	const isEmpty = screenshots.length === 0;
</script>

<div class="flex flex-1 flex-col gap-6">
	{#if isEmpty}
		<div
			role="button"
			tabindex="0"
			class="flex flex-1 flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed transition-colors cursor-pointer {isDragging
				? 'border-primary bg-primary/5'
				: 'border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/50'}"
			ondragover={handleDragOver}
			ondragleave={handleDragLeave}
			ondrop={handleDrop}
			onkeydown={(e) => e.key === 'Enter' && fileInput?.click()}
		>
			<div
				class="flex size-16 items-center justify-center rounded-full bg-muted transition-colors {isDragging
					? 'bg-primary/10'
					: ''}"
			>
				<ImageIcon class="size-8 text-muted-foreground" aria-hidden="true" />
			</div>
			<div class="text-center space-y-1">
				<p class="text-sm font-medium">
					{isDragging ? 'Drop your screenshot here' : 'No screenshots in this folder'}
				</p>
				<p class="text-muted-foreground text-xs">
					{isDragging ? 'Release to upload' : 'Drag and drop an image, or upload via button'}
				</p>
			</div>
			<input
				bind:this={fileInput}
				type="file"
				accept={ACCEPT}
				class="sr-only"
				onchange={handleFileSelect}
				aria-label="Upload screenshot"
			/>
			<Button
				variant="outline"
				size="sm"
				onclick={() => fileInput?.click()}
				onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), fileInput?.click())}
			>
				<Upload class="size-4" />
				Upload screenshot
			</Button>
		</div>
	{:else}
		<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
			{#each screenshots as shot (shot.id)}
				<a
					href={shot.url}
					target="_blank"
					rel="noopener noreferrer"
					class="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted shadow-sm transition-shadow hover:shadow-md"
				>
					<img
						src={shot.url}
						alt={shot.fileName}
						class="size-full object-cover transition-transform group-hover:scale-105"
					/>
					<div
						class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100"
					>
						<p class="truncate text-xs text-white">{shot.fileName}</p>
					</div>
				</a>
			{/each}
			<div
				role="button"
				tabindex="0"
				class="flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/30 transition-colors cursor-pointer hover:border-muted-foreground/50 hover:bg-muted/50"
				ondragover={handleDragOver}
				ondragleave={handleDragLeave}
				ondrop={handleDrop}
				onkeydown={(e) => e.key === 'Enter' && fileInput?.click()}
			>
				<Upload class="size-6 text-muted-foreground" />
				<span class="text-muted-foreground text-xs">Add more</span>
				<input
					bind:this={fileInput}
					type="file"
					accept={ACCEPT}
					class="sr-only"
					onchange={handleFileSelect}
					aria-label="Upload screenshot"
				/>
			</div>
		</div>
	{/if}

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
