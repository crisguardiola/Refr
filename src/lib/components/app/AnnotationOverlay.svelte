<script lang="ts">
	export type AnnotationStroke = {
		points: { x: number; y: number }[];
		color?: string;
		width?: number;
	};

	export type AnnotationData = {
		strokes?: AnnotationStroke[];
	};

	let {
		annotationData = null,
		containerRef,
		imageRef
	}: {
		annotationData?: AnnotationData | null;
		containerRef: HTMLDivElement;
		imageRef: HTMLImageElement;
	} = $props();

	const DEFAULT_COLOR = 'rgb(0, 200, 160)';
	const DEFAULT_WIDTH = 2;

	let layoutTick = $state(0);

	$effect(() => {
		const container = containerRef;
		const image = imageRef;
		if (!container || !image) return;
		const ro = new ResizeObserver(() => {
			layoutTick++;
		});
		ro.observe(container);
		ro.observe(image);
		return () => ro.disconnect();
	});

	function toOverlayCoords(nx: number, ny: number): { x: number; y: number } | null {
		if (!containerRef || !imageRef) return null;
		const imgRect = imageRef.getBoundingClientRect();
		const containerRect = containerRef.getBoundingClientRect();
		if (imgRect.width <= 0 || imgRect.height <= 0) return null;
		const numX = Number(nx);
		const numY = Number(ny);
		if (Number.isNaN(numX) || Number.isNaN(numY)) return null;
		const imageX = imgRect.left - containerRect.left;
		const imageY = imgRect.top - containerRect.top;
		const x = imageX + numX * imgRect.width;
		const y = imageY + numY * imgRect.height;
		if (Number.isNaN(x) || Number.isNaN(y)) return null;
		return { x, y };
	}

	const paths = $derived.by(() => {
		layoutTick; // depend on layout tick for resize reactivity
		if (!containerRef || !imageRef) return [];
		const strokes = annotationData?.strokes ?? [];
		const filtered = strokes.filter((s) => s.points.length >= 2);
		const result = filtered
			.map((stroke) => {
				const pts = stroke.points.map((p) => toOverlayCoords(p.x, p.y)).filter((p): p is { x: number; y: number } => p !== null);
				if (pts.length < 2) return null;
				return {
					d: `M ${pts[0].x} ${pts[0].y} ${pts.slice(1).map((p) => `L ${p.x} ${p.y}`).join(' ')}`,
					color: stroke.color ?? DEFAULT_COLOR,
					width: stroke.width ?? DEFAULT_WIDTH
				};
			})
			.filter((p): p is NonNullable<typeof p> => p !== null);
		return result;
	});
</script>

{#if paths.length > 0}
	<svg
		class="pointer-events-none absolute inset-0 z-10 size-full"
		aria-hidden="true"
	>
		{#each paths as path}
			<path
				d={path.d}
				fill="none"
				stroke={path.color}
				stroke-width={path.width}
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		{/each}
	</svg>
{/if}
