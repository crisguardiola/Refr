<script lang="ts">
	import { Check, X } from '@lucide/svelte';

	export type AnnotationStroke = {
		points: { x: number; y: number }[];
		color?: string;
		width?: number;
	};

	export type AnnotationData = {
		strokes?: AnnotationStroke[];
	};

	let {
		imageSrc = '',
		imageAlt = '',
		initialData = null,
		onSave,
		onCancel
	}: {
		imageSrc: string;
		imageAlt: string;
		initialData?: AnnotationData | null;
		onSave: (data: AnnotationData) => void;
		onCancel: () => void;
	} = $props();

	let containerRef: HTMLDivElement;
	let canvasRef: HTMLCanvasElement;
	let imgRef: HTMLImageElement;

	const DEFAULT_COLOR = '#ffffff';
	const DEFAULT_WIDTH = 3;

	let strokes = $state<AnnotationStroke[]>(
		initialData?.strokes ? [...initialData.strokes.map((s) => ({ ...s, points: [...s.points] }))] : []
	);
	let isDrawing = $state(false);
	let currentStroke = $state<{ x: number; y: number }[]>([]);

	function getRects() {
		if (!imgRef || !containerRef) return null;
		const imgRect = imgRef.getBoundingClientRect();
		const containerRect = containerRef.getBoundingClientRect();
		return {
			img: { left: imgRect.left, top: imgRect.top, width: imgRect.width, height: imgRect.height },
			container: { left: containerRect.left, top: containerRect.top, width: containerRect.width, height: containerRect.height }
		};
	}

	function toNormalized(clientX: number, clientY: number): { x: number; y: number } | null {
		const rects = getRects();
		if (!rects || rects.img.width <= 0 || rects.img.height <= 0) return null;
		const { img } = rects;
		const x = (clientX - img.left) / img.width;
		const y = (clientY - img.top) / img.height;
		return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
	}

	function toCanvasCoords(nx: number, ny: number): { x: number; y: number } {
		const rects = getRects();
		if (!rects) return { x: 0, y: 0 };
		const { img, container } = rects;
		const imageX = img.left - container.left;
		const imageY = img.top - container.top;
		return {
			x: imageX + nx * img.width,
			y: imageY + ny * img.height
		};
	}

	function redraw() {
		if (!canvasRef) return;
		const ctx = canvasRef.getContext('2d');
		if (!ctx) return;
		ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);
		const color = DEFAULT_COLOR;
		const width = DEFAULT_WIDTH;
		for (const stroke of strokes) {
			if (stroke.points.length < 2) continue;
			ctx.strokeStyle = stroke.color ?? color;
			ctx.lineWidth = stroke.width ?? width;
			ctx.lineCap = 'round';
			ctx.lineJoin = 'round';
			ctx.beginPath();
			const p0 = toCanvasCoords(stroke.points[0].x, stroke.points[0].y);
			ctx.moveTo(p0.x, p0.y);
			for (let i = 1; i < stroke.points.length; i++) {
				const p = toCanvasCoords(stroke.points[i].x, stroke.points[i].y);
				ctx.lineTo(p.x, p.y);
			}
			ctx.stroke();
		}
		if (currentStroke.length >= 2) {
			ctx.strokeStyle = color;
			ctx.lineWidth = width;
			ctx.lineCap = 'round';
			ctx.lineJoin = 'round';
			ctx.beginPath();
			const p0 = toCanvasCoords(currentStroke[0].x, currentStroke[0].y);
			ctx.moveTo(p0.x, p0.y);
			for (let i = 1; i < currentStroke.length; i++) {
				const p = toCanvasCoords(currentStroke[i].x, currentStroke[i].y);
				ctx.lineTo(p.x, p.y);
			}
			ctx.stroke();
		}
	}

	$effect(() => {
		redraw();
	});

	function resizeCanvas() {
		if (!canvasRef || !containerRef) return;
		const rect = containerRef.getBoundingClientRect();
		const dpr = window.devicePixelRatio ?? 1;
		canvasRef.width = Math.floor(rect.width * dpr);
		canvasRef.height = Math.floor(rect.height * dpr);
		canvasRef.style.width = `${rect.width}px`;
		canvasRef.style.height = `${rect.height}px`;
		const ctx = canvasRef.getContext('2d');
		if (ctx) ctx.scale(dpr, dpr);
		redraw();
	}

	$effect(() => {
		if (!containerRef) return;
		const ro = new ResizeObserver(resizeCanvas);
		ro.observe(containerRef);
		return () => ro.disconnect();
	});

	function handlePointerDown(e: PointerEvent) {
		e.preventDefault();
		const pt = toNormalized(e.clientX, e.clientY);
		if (pt) {
			isDrawing = true;
			currentStroke = [pt];
		}
	}

	function handlePointerMove(e: PointerEvent) {
		if (!isDrawing) return;
		const pt = toNormalized(e.clientX, e.clientY);
		if (pt) {
			currentStroke = [...currentStroke, pt];
			redraw();
		}
	}

	function handlePointerUp() {
		if (isDrawing && currentStroke.length > 0) {
			strokes = [...strokes, { points: currentStroke, color: DEFAULT_COLOR, width: DEFAULT_WIDTH }];
			currentStroke = [];
			isDrawing = false;
			redraw();
		}
	}

	function handlePointerLeave() {
		if (isDrawing) handlePointerUp();
	}

	function handleSave() {
		onSave({ strokes });
	}

	function handleCancel() {
		onCancel();
	}
</script>

<div
	bind:this={containerRef}
	class="relative size-full flex min-h-0 flex-1 items-center justify-center overflow-hidden"
	role="presentation"
>
	<img
		bind:this={imgRef}
		src={imageSrc}
		alt={imageAlt}
		class="max-h-full max-w-full w-auto h-auto object-contain select-none pointer-events-none"
		draggable={false}
	/>
	<canvas
		bind:this={canvasRef}
		class="absolute inset-0 cursor-crosshair touch-none"
		style="width: 100%; height: 100%;"
		onpointerdown={handlePointerDown}
		onpointermove={handlePointerMove}
		onpointerup={handlePointerUp}
		onpointerleave={handlePointerLeave}
		onpointercancel={handlePointerUp}
		aria-label="Annotation canvas"
	></canvas>
	<div
		class="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2 rounded-lg bg-black/60 p-2"
		role="toolbar"
	>
		<button
			type="button"
			class="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
			onclick={handleSave}
			aria-label="Save annotations"
		>
			<Check class="size-4" />
			Save
		</button>
		<button
			type="button"
			class="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
			onclick={handleCancel}
			aria-label="Cancel"
		>
			<X class="size-4" />
			Cancel
		</button>
	</div>
</div>
