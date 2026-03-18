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

	function toOverlayCoords(nx: number, ny: number): { x: number; y: number } {
		if (!containerRef || !imageRef) return { x: 0, y: 0 };
		const imgRect = imageRef.getBoundingClientRect();
		const containerRect = containerRef.getBoundingClientRect();
		const imageX = imgRect.left - containerRect.left;
		const imageY = imgRect.top - containerRect.top;
		return {
			x: imageX + nx * imgRect.width,
			y: imageY + ny * imgRect.height
		};
	}

	const paths = $derived.by(() => {
		layoutTick; // depend on layout tick for resize reactivity
		const strokes = annotationData?.strokes ?? [];
		return strokes
			.filter((s) => s.points.length >= 2)
			.map((stroke) => {
				const pts = stroke.points.map((p) => toOverlayCoords(p.x, p.y));
				return {
					d: `M ${pts[0].x} ${pts[0].y} ${pts.slice(1).map((p) => `L ${p.x} ${p.y}`).join(' ')}`,
					color: stroke.color ?? DEFAULT_COLOR,
					width: stroke.width ?? DEFAULT_WIDTH
				};
			});
	});
</script>

{#if paths.length > 0}
	<svg
		class="pointer-events-none absolute inset-0 size-full"
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
