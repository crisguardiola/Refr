<script lang="ts">
	import { Check, X, Undo2, Redo2, Eraser, Pencil } from '@lucide/svelte';

	export type AnnotationStroke = {
		points: { x: number; y: number }[];
		color?: string;
		width?: number;
	};

	export type AnnotationData = {
		strokes?: AnnotationStroke[];
	};

	const COLORS = [
		{ value: 'rgb(0, 200, 160)', label: 'Teal' },
		{ value: '#f472b6', label: 'Rose' },
		{ value: '#f8fafc', label: 'White' },
		{ value: '#334155', label: 'Slate' }
	] as const;

	const STROKE_WIDTHS = [2, 4, 6, 8] as const;

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

	const DEFAULT_COLOR = 'rgb(0, 200, 160)';
	const DEFAULT_WIDTH = 4;

	let strokes = $state<AnnotationStroke[]>(
		initialData?.strokes ? [...initialData.strokes.map((s) => ({ ...s, points: [...s.points] }))] : []
	);
	let history = $state<AnnotationStroke[][]>([]);
	let redoStack = $state<AnnotationStroke[][]>([]);
	let selectedColor = $state(DEFAULT_COLOR);
	let selectedWidth = $state(DEFAULT_WIDTH);
	let mode = $state<'draw' | 'erase'>('draw');
	let isDrawing = $state(false);
	let currentStroke = $state<{ x: number; y: number }[]>([]);

	const canUndo = $derived(history.length > 0);
	const canRedo = $derived(redoStack.length > 0);
	const ERASER_THRESHOLD = 0.04; // normalized distance to hit a stroke

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

	function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
		const dx = x2 - x1;
		const dy = y2 - y1;
		const len2 = dx * dx + dy * dy;
		if (len2 === 0) return Math.hypot(px - x1, py - y1);
		let t = ((px - x1) * dx + (py - y1) * dy) / len2;
		t = Math.max(0, Math.min(1, t));
		const projX = x1 + t * dx;
		const projY = y1 + t * dy;
		return Math.hypot(px - projX, py - projY);
	}

	function findStrokeAt(nx: number, ny: number): number {
		let bestIdx = -1;
		let bestDist = ERASER_THRESHOLD;
		for (let i = 0; i < strokes.length; i++) {
			const stroke = strokes[i];
			if (stroke.points.length < 2) continue;
			for (let j = 0; j < stroke.points.length - 1; j++) {
				const p1 = stroke.points[j];
				const p2 = stroke.points[j + 1];
				const d = distToSegment(nx, ny, p1.x, p1.y, p2.x, p2.y);
				if (d < bestDist) {
					bestDist = d;
					bestIdx = i;
				}
			}
		}
		return bestIdx;
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
			ctx.strokeStyle = selectedColor;
			ctx.lineWidth = selectedWidth;
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
		if (!pt) return;

		if (mode === 'erase') {
			const idx = findStrokeAt(pt.x, pt.y);
			if (idx >= 0) {
				history = [...history, strokes];
				redoStack = [];
				strokes = strokes.filter((_, i) => i !== idx);
				redraw();
			}
			return;
		}

		isDrawing = true;
		currentStroke = [pt];
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
			history = [...history, strokes];
			redoStack = [];
			strokes = [...strokes, { points: currentStroke, color: selectedColor, width: selectedWidth }];
			currentStroke = [];
			isDrawing = false;
			redraw();
		}
	}

	function handleUndo() {
		if (history.length === 0) return;
		redoStack = [...redoStack, strokes];
		strokes = history[history.length - 1];
		history = history.slice(0, -1);
		redraw();
	}

	function handleRedo() {
		if (redoStack.length === 0) return;
		history = [...history, strokes];
		strokes = redoStack[redoStack.length - 1];
		redoStack = redoStack.slice(0, -1);
		redraw();
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
		class="absolute inset-0 touch-none {mode === 'erase' ? 'cursor-cell' : 'cursor-crosshair'}"
		style="width: 100%; height: 100%;"
		onpointerdown={handlePointerDown}
		onpointermove={handlePointerMove}
		onpointerup={handlePointerUp}
		onpointerleave={handlePointerLeave}
		onpointercancel={handlePointerUp}
		aria-label="Annotation canvas"
	></canvas>
	<div
		class="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 flex-nowrap items-center justify-between gap-3 rounded-lg bg-black/60 p-3"
		role="toolbar"
	>
		<div class="flex flex-nowrap items-center gap-3">
		<div class="flex items-center gap-1">
			<button
				type="button"
				class="rounded-md p-2 transition-colors {mode === 'draw'
					? 'bg-white/20 text-white'
					: 'text-white/80 hover:bg-white/20'}"
				onclick={() => (mode = 'draw')}
				aria-label="Draw"
				aria-pressed={mode === 'draw'}
			>
				<Pencil class="size-4" />
			</button>
			<button
				type="button"
				class="rounded-md p-2 transition-colors {mode === 'erase'
					? 'bg-white/20 text-white'
					: 'text-white/80 hover:bg-white/20'}"
				onclick={() => (mode = 'erase')}
				aria-label="Eraser"
				aria-pressed={mode === 'erase'}
			>
				<Eraser class="size-4" />
			</button>
		</div>
		<div class="flex items-center gap-1">
			<button
				type="button"
				class="rounded-md p-2 text-white/80 transition-colors hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
				onclick={handleUndo}
				disabled={!canUndo}
				aria-label="Undo"
			>
				<Undo2 class="size-4" />
			</button>
			<button
				type="button"
				class="rounded-md p-2 text-white/80 transition-colors hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
				onclick={handleRedo}
				disabled={!canRedo}
				aria-label="Redo"
			>
				<Redo2 class="size-4" />
			</button>
		</div>
		{#if mode === 'draw'}
		<div class="flex items-center gap-1.5">
			<span class="text-xs text-white/60">Color</span>
			{#each COLORS as color}
				<button
					type="button"
					class="size-7 rounded-full border-2 transition-all {selectedColor === color.value
						? 'border-white scale-110'
						: color.value === '#f8fafc'
							? 'border-white/40 hover:scale-105'
							: 'border-transparent hover:scale-105'}"
					style="background-color: {color.value}"
					onclick={() => (selectedColor = color.value)}
					aria-label={color.label}
					aria-pressed={selectedColor === color.value}
				></button>
			{/each}
		</div>
		<div class="flex items-center gap-1.5">
			<span class="text-xs text-white/60">Size</span>
			{#each STROKE_WIDTHS as w}
				<button
					type="button"
					class="flex h-7 min-w-7 items-center justify-center rounded-md px-2 text-xs font-medium transition-colors {selectedWidth === w
						? 'bg-white/30 text-white'
						: 'text-white/80 hover:bg-white/20'}"
					onclick={() => (selectedWidth = w)}
					aria-label="Stroke width {w}"
					aria-pressed={selectedWidth === w}
				>
					{w}
				</button>
			{/each}
		</div>
		{/if}
		<div class="h-4 w-px bg-white/30" role="separator"></div>
		</div>
		<div class="flex items-center gap-2 ml-auto">
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
</div>
