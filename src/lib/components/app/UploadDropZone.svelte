<script lang="ts">
	import { Upload, ImageIcon } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';

	let {
		variant = 'empty',
		compact = false,
		emptyTitle = 'No screenshots in this folder',
		emptySubtitle = 'Drag and drop an image, or click to browse',
		addMoreLabel = 'Add more',
		addMoreSubtitle = 'Drop or click to upload',
		dropTitle = 'Drop your screenshot here',
		dropSubtitle = 'Release to upload',
		isDragging = false,
		onclick,
		onkeydown,
		ondragover,
		ondragleave,
		ondrop,
		class: className = ''
	}: {
		variant?: 'empty' | 'add-more';
		compact?: boolean;
		emptyTitle?: string;
		emptySubtitle?: string;
		addMoreLabel?: string;
		addMoreSubtitle?: string;
		dropTitle?: string;
		dropSubtitle?: string;
		isDragging?: boolean;
		onclick?: (e: MouseEvent) => void;
		onkeydown?: (e: KeyboardEvent) => void;
		ondragover?: (e: DragEvent) => void;
		ondragleave?: (e: DragEvent) => void;
		ondrop?: (e: DragEvent) => void;
		class?: string;
	} = $props();
</script>

{#if variant === 'empty'}
	<div
		role="button"
		tabindex="0"
		class="group flex flex-1 flex-col items-center justify-center gap-6 rounded-2xl border-2 border-dashed px-8 py-16 transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 {className}
			{isDragging
				? 'border-primary bg-primary/5 scale-[1.01] shadow-lg shadow-primary/5'
				: 'border-muted-foreground/20 bg-gradient-to-b from-muted/30 to-muted/10 hover:border-muted-foreground/40 hover:from-muted/40 hover:to-muted/20 hover:shadow-md'}"
		{onclick}
		{onkeydown}
		{ondragover}
		{ondragleave}
		{ondrop}
	>
		<div
			class="flex size-20 items-center justify-center rounded-2xl transition-all duration-200 {isDragging
				? 'bg-primary/15 scale-110'
				: 'bg-muted/80 group-hover:bg-muted group-hover:scale-105'}"
		>
			<ImageIcon
				class="size-10 transition-colors {isDragging ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground/70'}"
				aria-hidden="true"
			/>
		</div>
		<div class="text-center space-y-2 max-w-sm">
			<p class="text-base font-semibold tracking-tight">
				{isDragging ? dropTitle : emptyTitle}
			</p>
			<p class="text-sm text-muted-foreground leading-relaxed">
				{isDragging ? dropSubtitle : emptySubtitle}
			</p>
		</div>
		<Button
			variant="outline"
			size="default"
			class="gap-2 shadow-sm"
			onclick={(e) => {
				e.stopPropagation();
				onclick?.(e as unknown as MouseEvent);
			}}
			onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), onclick?.(e as unknown as MouseEvent))}
		>
			<Upload class="size-4" />
			Choose file
		</Button>
	</div>
{:else}
	<div
		role="button"
		tabindex="0"
		class="group flex rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 {className}
			{compact
				? 'min-h-0 flex-row items-center justify-center gap-4 px-6 py-4'
				: 'min-h-32 flex-col items-center justify-center gap-3 px-4 py-6 break-inside-avoid'}
			{isDragging
				? 'border-primary bg-primary/5 scale-[1.01] shadow-lg shadow-primary/5'
				: 'border-muted-foreground/20 bg-muted/20 hover:border-muted-foreground/35 hover:bg-muted/40 hover:shadow-sm'}"
		{onclick}
		{onkeydown}
		{ondragover}
		{ondragleave}
		{ondrop}
	>
		<div
			class="flex shrink-0 items-center justify-center rounded-xl transition-all duration-200 {compact ? 'size-10' : 'size-12'} {isDragging
				? 'bg-primary/15'
				: 'bg-muted/60 group-hover:bg-muted'}"
		>
			<Upload
				class="{compact ? 'size-5' : 'size-6'} transition-colors {isDragging ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground/70'}"
				aria-hidden="true"
			/>
		</div>
		<div class="{compact ? 'text-left' : 'text-center'} space-y-0.5">
			<p class="text-sm font-medium">
				{isDragging ? dropTitle : addMoreLabel}
			</p>
			<p class="text-xs text-muted-foreground">
				{isDragging ? dropSubtitle : addMoreSubtitle}
			</p>
		</div>
	</div>
{/if}
