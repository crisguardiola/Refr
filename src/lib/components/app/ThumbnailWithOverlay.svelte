<script lang="ts">
	import AnnotationOverlay from '$lib/components/app/AnnotationOverlay.svelte';

	let {
		src,
		alt,
		class: className = '',
		showAnnotations = false,
		annotationData = null
	}: {
		src: string;
		alt: string;
		class?: string;
		showAnnotations?: boolean;
		annotationData?: { strokes?: { points: { x: number; y: number }[]; color?: string; width?: number }[] } | null;
	} = $props();

	let containerRef = $state<HTMLDivElement | undefined>(undefined);
	let imgRef = $state<HTMLImageElement | undefined>(undefined);
</script>

<div bind:this={containerRef} class="relative size-full">
	<img
		bind:this={imgRef}
		{src}
		{alt}
		width={400}
		height={400}
		loading="lazy"
		class="size-full object-cover transition-transform group-hover:scale-105 bg-muted/50 {className}"
	/>
	{#if showAnnotations && annotationData?.strokes?.length && containerRef && imgRef}
		<AnnotationOverlay
			{annotationData}
			containerRef={containerRef}
			imageRef={imgRef}
		/>
	{/if}
</div>
