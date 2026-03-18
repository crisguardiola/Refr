<script lang="ts">
	import { ArrowRight, Check, Eraser, Hand, MousePointer, Pencil, Trash2, X } from '@lucide/svelte';
	import { cloudinaryUrl } from '$lib/cloudinary.js';

	export type AnnotationStroke = { points: { x: number; y: number }[]; color?: string; width?: number };
	export type FlowNode = {
		id: number;
		x: number;
		y: number;
		width: number;
		height: number;
	};
	export type FlowArrow = { from: number; to: number };
	export type FlowFreeArrow = { fromX: number; fromY: number; toX: number; toY: number };

	type Screenshot = {
		id: number;
		url: string;
		fileName: string;
	};

	const NODE_WIDTH = 180;
	const NODE_HEIGHT = 180;
	const NODE_GAP = 40;

	let {
		screenshots,
		initialNodes = [],
		initialArrows = [],
		initialFreeArrows = [],
		initialCanvasMarkup = null,
		folderId = null,
		onSave,
		onCancel
	}: {
		screenshots: Screenshot[];
		initialNodes?: FlowNode[];
		initialArrows?: FlowArrow[];
		initialFreeArrows?: FlowFreeArrow[];
		initialCanvasMarkup?: { strokes?: AnnotationStroke[] } | null;
		folderId?: number | null;
		onSave: (data: { nodes: FlowNode[]; arrows: FlowArrow[]; freeArrows: FlowFreeArrow[]; canvasMarkup?: { strokes: AnnotationStroke[] } }) => void | Promise<void>;
		onCancel: () => void;
	} = $props();

	const MARKUP_COLORS = [
		{ value: 'rgb(0, 200, 160)', label: 'Teal' },
		{ value: '#f472b6', label: 'Rose' },
		{ value: '#f8fafc', label: 'White' },
		{ value: '#334155', label: 'Slate' }
	] as const;
	const MARKUP_WIDTHS = [2, 4, 6, 8] as const;

	let nodes = $state<FlowNode[]>(
		initialNodes.length > 0
			? initialNodes
			: screenshots.map((s, i) => ({
					id: s.id,
					x: 80 + (i % 4) * (NODE_WIDTH + NODE_GAP),
					y: 80 + Math.floor(i / 4) * (NODE_HEIGHT + NODE_GAP),
					width: NODE_WIDTH,
					height: NODE_HEIGHT
				}))
	);
	let arrows = $state<FlowArrow[]>(initialArrows);
	let freeArrows = $state<FlowFreeArrow[]>(initialFreeArrows ?? []);
	let mode = $state<'move' | 'arrow' | 'select' | 'markup'>('move');
	let selectedScreenId = $state<number | null>(null);
	let selectedArrow = $state<{ type: 'screen'; index: number } | { type: 'free'; index: number } | null>(null);
	let canvasMarkupStrokes = $state<AnnotationStroke[]>(
		initialCanvasMarkup?.strokes ? initialCanvasMarkup.strokes.map((s) => ({ ...s, points: [...s.points] })) : []
	);
	let markupDrawMode = $state<'draw' | 'erase'>('draw');
	let markupColor = $state(MARKUP_COLORS[0].value);
	let markupWidth = $state(MARKUP_WIDTHS[1]);
	let markupDrawing = $state(false);
	let markupCurrentStroke = $state<{ x: number; y: number }[]>([]);
	let markupCanvasRef: HTMLCanvasElement;
	let draggingId = $state<number | null>(null);
	let dragOffset = $state({ x: 0, y: 0 });
	let canvasRef: HTMLDivElement;

	// Arrow drawing: from selected screen (center→center) or free (point→point)
	let drawingArrow = $state<{ type: 'screen'; fromScreen: number } | { type: 'free'; fromX: number; fromY: number } | null>(null);
	let drawCurrent = $state<{ x: number; y: number } | null>(null);

	const ARROW_HIT_THRESHOLD = 12;
	const MARKUP_ERASER_THRESHOLD = 8;

	function getNodeById(id: number) {
		return nodes.find((n) => n.id === id);
	}

	function getNodeCenter(node: FlowNode) {
		return {
			x: node.x + node.width / 2,
			y: node.y + node.height / 2
		};
	}

	function clientToCanvas(clientX: number, clientY: number) {
		if (!canvasRef) return null;
		const rect = canvasRef.getBoundingClientRect();
		return { x: clientX - rect.left, y: clientY - rect.top };
	}

	function hitTestNode(clientX: number, clientY: number): number | null {
		const pt = clientToCanvas(clientX, clientY);
		if (!pt) return null;
		for (const node of nodes) {
			if (
				pt.x >= node.x &&
				pt.x <= node.x + node.width &&
				pt.y >= node.y &&
				pt.y <= node.y + node.height
			) {
				return node.id;
			}
		}
		return null;
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

	function hitTestArrow(clientX: number, clientY: number): { type: 'screen'; index: number } | { type: 'free'; index: number } | null {
		const pt = clientToCanvas(clientX, clientY);
		if (!pt) return null;
		let best: { type: 'screen' | 'free'; index: number; dist: number } | null = null;
		// Screen arrows
		for (let i = 0; i < arrows.length; i++) {
			const fromNode = getNodeById(arrows[i].from);
			const toNode = getNodeById(arrows[i].to);
			if (!fromNode || !toNode) continue;
			const fromC = getNodeCenter(fromNode);
			const toC = getNodeCenter(toNode);
			const d = distToSegment(pt.x, pt.y, fromC.x, fromC.y, toC.x, toC.y);
			if (d < ARROW_HIT_THRESHOLD && (!best || d < best.dist)) {
				best = { type: 'screen', index: i, dist: d };
			}
		}
		// Free arrows
		for (let i = 0; i < freeArrows.length; i++) {
			const fa = freeArrows[i];
			const d = distToSegment(pt.x, pt.y, fa.fromX, fa.fromY, fa.toX, fa.toY);
			if (d < ARROW_HIT_THRESHOLD && (!best || d < best.dist)) {
				best = { type: 'free', index: i, dist: d };
			}
		}
		return best ? { type: best.type, index: best.index } : null;
	}

	function deleteSelectedArrow() {
		if (!selectedArrow) return;
		if (selectedArrow.type === 'screen') {
			arrows = arrows.filter((_, i) => i !== selectedArrow!.index);
		} else {
			freeArrows = freeArrows.filter((_, i) => i !== selectedArrow!.index);
		}
		selectedArrow = null;
	}

	function findMarkupStrokeAt(cx: number, cy: number): number {
		let bestIdx = -1;
		let bestDist = MARKUP_ERASER_THRESHOLD;
		for (let i = 0; i < canvasMarkupStrokes.length; i++) {
			const stroke = canvasMarkupStrokes[i];
			if (stroke.points.length < 2) continue;
			for (let j = 0; j < stroke.points.length - 1; j++) {
				const p1 = stroke.points[j];
				const p2 = stroke.points[j + 1];
				const d = distToSegment(cx, cy, p1.x, p1.y, p2.x, p2.y);
				if (d < bestDist) {
					bestDist = d;
					bestIdx = i;
				}
			}
		}
		return bestIdx;
	}

	function redrawMarkupCanvas() {
		if (!markupCanvasRef || !canvasRef) return;
		const rect = canvasRef.getBoundingClientRect();
		const dpr = window.devicePixelRatio ?? 1;
		markupCanvasRef.width = Math.floor(rect.width * dpr);
		markupCanvasRef.height = Math.floor(rect.height * dpr);
		markupCanvasRef.style.width = `${rect.width}px`;
		markupCanvasRef.style.height = `${rect.height}px`;
		const ctx = markupCanvasRef.getContext('2d');
		if (!ctx) return;
		ctx.scale(dpr, dpr);
		ctx.clearRect(0, 0, rect.width, rect.height);
		const defaultColor = MARKUP_COLORS[0].value;
		const defaultWidth = MARKUP_WIDTHS[1];
		for (const stroke of canvasMarkupStrokes) {
			if (stroke.points.length < 2) continue;
			ctx.strokeStyle = stroke.color ?? defaultColor;
			ctx.lineWidth = stroke.width ?? defaultWidth;
			ctx.lineCap = 'round';
			ctx.lineJoin = 'round';
			ctx.beginPath();
			ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
			for (let i = 1; i < stroke.points.length; i++) {
				ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
			}
			ctx.stroke();
		}
		if (markupCurrentStroke.length >= 2) {
			ctx.strokeStyle = markupColor;
			ctx.lineWidth = markupWidth;
			ctx.lineCap = 'round';
			ctx.lineJoin = 'round';
			ctx.beginPath();
			ctx.moveTo(markupCurrentStroke[0].x, markupCurrentStroke[0].y);
			for (let i = 1; i < markupCurrentStroke.length; i++) {
				ctx.lineTo(markupCurrentStroke[i].x, markupCurrentStroke[i].y);
			}
			ctx.stroke();
		}
	}

	function handleMarkupPointerDown(e: PointerEvent) {
		e.preventDefault();
		const pt = clientToCanvas(e.clientX, e.clientY);
		if (!pt) return;
		if (markupDrawMode === 'erase') {
			const idx = findMarkupStrokeAt(pt.x, pt.y);
			if (idx >= 0) {
				canvasMarkupStrokes = canvasMarkupStrokes.filter((_, i) => i !== idx);
				redrawMarkupCanvas();
			}
			return;
		}
		markupDrawing = true;
		markupCurrentStroke = [pt];
		(e.target as HTMLCanvasElement)?.setPointerCapture?.(e.pointerId);
	}

	function handleMarkupPointerMove(e: PointerEvent) {
		if (!markupDrawing) return;
		const pt = clientToCanvas(e.clientX, e.clientY);
		if (pt) {
			markupCurrentStroke = [...markupCurrentStroke, pt];
			redrawMarkupCanvas();
		}
	}

	function handleMarkupPointerUp() {
		if (markupDrawing && markupCurrentStroke.length > 0) {
			canvasMarkupStrokes = [
				...canvasMarkupStrokes,
				{ points: markupCurrentStroke, color: markupColor, width: markupWidth }
			];
			markupCurrentStroke = [];
			markupDrawing = false;
			redrawMarkupCanvas();
		}
	}

	function handleNodePointerDown(e: PointerEvent, nodeId: number) {
		e.preventDefault();
		const node = getNodeById(nodeId);
		if (!node) return;
		if (mode === 'markup') return; // drawing handled by overlay
		if (mode === 'arrow') {
			if (drawingArrow) return; // already drawing
			if (selectedScreenId === nodeId) {
				// Start drawing from selected screen (click on border = click on screen)
				drawingArrow = { type: 'screen', fromScreen: nodeId };
				drawCurrent = clientToCanvas(e.clientX, e.clientY);
			} else {
				// Select this screen
				selectedScreenId = nodeId;
			}
		} else if (mode === 'select') {
			selectedArrow = null; // clicking on node deselects arrow
		} else if (mode === 'move' && canvasRef) {
			const rect = canvasRef.getBoundingClientRect();
			draggingId = nodeId;
			dragOffset = {
				x: e.clientX - rect.left - node.x,
				y: e.clientY - rect.top - node.y
			};
		}
	}

	function handleCanvasPointerDown(e: PointerEvent) {
		const target = e.target as HTMLElement;
		if (target.closest('img')) return; // hit a screen, let it handle
		const pt = clientToCanvas(e.clientX, e.clientY);
		if (!pt) return;
		if (mode === 'select') {
			const hit = hitTestArrow(e.clientX, e.clientY);
			selectedArrow = hit;
			return;
		}
		if (mode === 'arrow' && !drawingArrow) {
			// No screen selected: start free arrow
			drawingArrow = { type: 'free', fromX: pt.x, fromY: pt.y };
			drawCurrent = pt;
		}
	}

	function handlePointerMove(e: PointerEvent) {
		const pt = clientToCanvas(e.clientX, e.clientY);
		if (pt) drawCurrent = pt;
		if (draggingId === null || !canvasRef) return;
		const node = getNodeById(draggingId);
		if (!node) return;
		const rect = canvasRef.getBoundingClientRect();
		nodes = nodes.map((n) =>
			n.id === draggingId
				? {
						...n,
						x: Math.max(0, e.clientX - rect.left - dragOffset.x),
						y: Math.max(0, e.clientY - rect.top - dragOffset.y)
					}
				: n
		);
	}

	function handlePointerUp(e: PointerEvent) {
		if (drawingArrow) {
			const pt = clientToCanvas(e.clientX, e.clientY);
			const hitNode = hitTestNode(e.clientX, e.clientY);
			if (drawingArrow.type === 'screen') {
				if (hitNode && hitNode !== drawingArrow.fromScreen && pt) {
					arrows = [...arrows, { from: drawingArrow.fromScreen, to: hitNode }];
				}
				selectedScreenId = null;
			} else {
				if (pt) {
					const dx = pt.x - drawingArrow.fromX;
					const dy = pt.y - drawingArrow.fromY;
					const len = Math.sqrt(dx * dx + dy * dy);
					if (len >= 20) {
						freeArrows = [...freeArrows, { fromX: drawingArrow.fromX, fromY: drawingArrow.fromY, toX: pt.x, toY: pt.y }];
					}
				}
			}
			drawingArrow = null;
			drawCurrent = null;
			return;
		}
		draggingId = null;
	}

	$effect(() => {
		const onMove = (e: PointerEvent) => handlePointerMove(e);
		const onUp = (e: PointerEvent) => handlePointerUp(e);
		window.addEventListener('pointermove', onMove as EventListener);
		window.addEventListener('pointerup', onUp as EventListener);
		return () => {
			window.removeEventListener('pointermove', onMove as EventListener);
			window.removeEventListener('pointerup', onUp as EventListener);
		};
	});

	$effect(() => {
		if (mode !== 'markup') return;
		const onMove = (e: PointerEvent) => {
			handleMarkupPointerMove(e);
		};
		const onUp = () => handleMarkupPointerUp();
		window.addEventListener('pointermove', onMove as EventListener);
		window.addEventListener('pointerup', onUp as EventListener);
		return () => {
			window.removeEventListener('pointermove', onMove as EventListener);
			window.removeEventListener('pointerup', onUp as EventListener);
		};
	});

	$effect(() => {
		if (!canvasRef || !markupCanvasRef || mode !== 'markup') return;
		redrawMarkupCanvas();
		const ro = new ResizeObserver(redrawMarkupCanvas);
		ro.observe(canvasRef);
		return () => ro.disconnect();
	});

	$effect(() => {
		canvasMarkupStrokes;
		markupCurrentStroke;
		if (mode === 'markup' && markupCanvasRef) redrawMarkupCanvas();
	});

	async function handleSave() {
		await onSave({
			nodes,
			arrows,
			freeArrows,
			canvasMarkup: { strokes: canvasMarkupStrokes }
		});
	}
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape') {
			if (drawingArrow) drawingArrow = null;
			else if (selectedScreenId) selectedScreenId = null;
			else if (selectedArrow) selectedArrow = null;
			else onCancel();
		}
		if (e.key === 'Backspace' && selectedArrow) {
			e.preventDefault();
			deleteSelectedArrow();
		}
	}}
/>

<div
	class="fixed inset-0 z-[9999] flex flex-col bg-background"
	role="dialog"
	aria-modal="true"
	aria-label="Flow canvas"
>
	<!-- Top: Close button only -->
	<div class="absolute right-4 top-4 z-20">
		<button
			type="button"
			class="rounded-full p-2 text-muted-foreground hover:bg-muted transition-colors"
			aria-label="Close"
			onclick={onCancel}
		>
			<X class="size-5" />
		</button>
	</div>

	<!-- Canvas area -->
	<div class="relative min-h-0 flex-1 overflow-auto bg-background flow-canvas-dots">
		<div
			bind:this={canvasRef}
			class="relative min-h-[600px] min-w-[800px] p-8 {mode === 'arrow' && !drawingArrow
				? 'cursor-crosshair'
				: mode === 'select'
					? 'cursor-pointer'
					: mode === 'markup'
						? 'cursor-crosshair'
						: ''}"
			role="presentation"
			onpointerdown={handleCanvasPointerDown}
		>
			<!-- SVG layer for arrows -->
			<svg
				class="pointer-events-none absolute inset-0 size-full"
				style="left: 0; top: 0; width: 100%; height: 100%;"
			>
				<defs>
					<marker
						id="flow-arrowhead"
						markerWidth="7"
						markerHeight="5"
						refX="6"
						refY="2.5"
						orient="auto"
					>
						<polygon points="0 0, 7 2.5, 0 5" fill="var(--primary)" />
					</marker>
				</defs>
				<!-- Screen-to-screen arrows (center to center, adapt when screens move) -->
				{#each arrows as arrow, i}
					{@const fromNode = getNodeById(arrow.from)}
					{@const toNode = getNodeById(arrow.to)}
					{@const isSelected = selectedArrow?.type === 'screen' && selectedArrow?.index === i}
					{#if fromNode && toNode}
						{@const fromC = getNodeCenter(fromNode)}
						{@const toC = getNodeCenter(toNode)}
						{@const dx = toC.x - fromC.x}
						{@const dy = toC.y - fromC.y}
						{@const len = Math.sqrt(dx * dx + dy * dy) || 1}
						{@const ux = dx / len}
						{@const uy = dy / len}
						{@const tipX = toC.x - ux * (toNode.width / 2 + 4)}
						{@const tipY = toC.y - uy * (toNode.height / 2 + 4)}
						{@const startX = fromC.x + ux * (fromNode.width / 2 + 4)}
						{@const startY = fromC.y + uy * (fromNode.height / 2 + 4)}
						<line
							x1={startX}
							y1={startY}
							x2={tipX}
							y2={tipY}
							stroke={isSelected ? 'white' : 'var(--primary)'}
							stroke-width={isSelected ? '4' : '3'}
							stroke-opacity={isSelected ? '1' : '1'}
							marker-end="url(#flow-arrowhead)"
						/>
					{/if}
				{/each}
				<!-- Free arrows (fixed positions) -->
				{#each freeArrows as fa, i}
					{@const dx = fa.toX - fa.fromX}
					{@const dy = fa.toY - fa.fromY}
					{@const len = Math.sqrt(dx * dx + dy * dy) || 1}
					{@const ux = dx / len}
					{@const uy = dy / len}
					{@const isSelected = selectedArrow?.type === 'free' && selectedArrow?.index === i}
					<line
						x1={fa.fromX}
						y1={fa.fromY}
						x2={fa.toX - ux * 8}
						y2={fa.toY - uy * 8}
						stroke={isSelected ? 'white' : 'var(--primary)'}
						stroke-width={isSelected ? '4' : '3'}
						stroke-dasharray="4 2"
						marker-end="url(#flow-arrowhead)"
					/>
				{/each}
				<!-- Preview line while drawing -->
				{#if drawingArrow && drawCurrent}
					{#if drawingArrow.type === 'screen'}
						{@const fromNode = getNodeById(drawingArrow.fromScreen)}
						{#if fromNode}
							{@const fromC = getNodeCenter(fromNode)}
							{@const dx = drawCurrent.x - fromC.x}
							{@const dy = drawCurrent.y - fromC.y}
							{@const len = Math.sqrt(dx * dx + dy * dy) || 1}
							{@const ux = dx / len}
							{@const uy = dy / len}
							<line
								x1={fromC.x + ux * (fromNode.width / 2 + 4)}
								y1={fromC.y + uy * (fromNode.height / 2 + 4)}
								x2={drawCurrent.x}
								y2={drawCurrent.y}
								stroke="var(--primary)"
								stroke-width="3"
								stroke-dasharray="6 4"
								opacity="0.8"
								marker-end="url(#flow-arrowhead)"
							/>
						{/if}
					{:else}
						{@const dx = drawCurrent.x - drawingArrow.fromX}
						{@const dy = drawCurrent.y - drawingArrow.fromY}
						{@const len = Math.sqrt(dx * dx + dy * dy) || 1}
						{@const ux = dx / len}
						{@const uy = dy / len}
						<line
							x1={drawingArrow.fromX}
							y1={drawingArrow.fromY}
							x2={drawCurrent.x - ux * 8}
							y2={drawCurrent.y - uy * 8}
							stroke="var(--primary)"
							stroke-width="3"
							stroke-dasharray="6 4"
							opacity="0.8"
							marker-end="url(#flow-arrowhead)"
						/>
					{/if}
				{/if}
			</svg>

			<!-- Draggable nodes - image only -->
			{#each nodes as node (node.id)}
				{@const shot = screenshots.find((s) => s.id === node.id)}
				{#if shot}
					<img
						role="button"
						tabindex="0"
						src={cloudinaryUrl(shot.url, 'detail')}
						alt={shot.fileName}
						draggable="false"
						class="absolute block max-w-[400px] max-h-[400px] w-auto h-auto object-contain transition-shadow {mode === 'move'
							? 'cursor-grab active:cursor-grabbing'
							: 'cursor-crosshair'}
						hover:shadow-lg {selectedScreenId === node.id ? 'ring-2 ring-primary' : ''}
						{draggingId === node.id ? 'z-10' : ''}"
						style="left: {node.x}px; top: {node.y}px;"
						onpointerdown={(e) => handleNodePointerDown(e, node.id)}
						onkeydown={(e) => e.key === 'Enter' && handleNodePointerDown(e as unknown as PointerEvent, node.id)}
						onload={(e) => {
							const img = e.currentTarget;
							const w = img.naturalWidth;
							const h = img.naturalHeight;
							const max = 400;
							const scale = Math.min(1, max / Math.max(w, h));
							const dw = Math.round(w * scale);
							const dh = Math.round(h * scale);
							nodes = nodes.map((n) => (n.id === node.id ? { ...n, width: dw, height: dh } : n));
						}}
					/>
				{/if}
			{/each}

			<!-- Canvas-level markup overlay - draw directly on the flow -->
			{#if mode === 'markup'}
				<canvas
					bind:this={markupCanvasRef}
					class="absolute inset-0 z-10 touch-none {markupDrawMode === 'erase' ? 'cursor-cell' : 'cursor-crosshair'}"
					style="left: 0; top: 0; width: 100%; height: 100%;"
					onpointerdown={handleMarkupPointerDown}
					onpointerleave={handleMarkupPointerUp}
					onpointercancel={handleMarkupPointerUp}
					aria-label="Markup canvas"
				></canvas>
			{/if}
		</div>
	</div>

	<!-- Bottom toolbar - Mark up style -->
	<div
		class="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 flex-nowrap items-center justify-between gap-3 rounded-lg bg-black/60 px-4 py-3"
		role="toolbar"
	>
		<div class="flex flex-nowrap items-center gap-2">
			<button
				type="button"
				class="rounded-md p-2 transition-colors {mode === 'move'
					? 'bg-white/20 text-white'
					: 'text-white/80 hover:bg-white/20'}"
				onclick={() => (mode = 'move', selectedScreenId = null, drawingArrow = null, selectedArrow = null)}
				aria-label="Move screens"
				aria-pressed={mode === 'move'}
			>
				<Hand class="size-4" />
			</button>
			<button
				type="button"
				class="rounded-md p-2 transition-colors {mode === 'arrow'
					? 'bg-white/20 text-white'
					: 'text-white/80 hover:bg-white/20'}"
				onclick={() => (mode = 'arrow', selectedScreenId = null, drawingArrow = null, selectedArrow = null)}
				aria-label="Add arrow"
				aria-pressed={mode === 'arrow'}
			>
				<ArrowRight class="size-4" />
			</button>
			<button
				type="button"
				class="rounded-md p-2 transition-colors {mode === 'select'
					? 'bg-white/20 text-white'
					: 'text-white/80 hover:bg-white/20'}"
				onclick={() => (mode = 'select', selectedScreenId = null, drawingArrow = null)}
				aria-label="Select arrows"
				aria-pressed={mode === 'select'}
			>
				<MousePointer class="size-4" />
			</button>
			<button
				type="button"
				class="rounded-md p-2 transition-colors {mode === 'markup'
					? 'bg-white/20 text-white'
					: 'text-white/80 hover:bg-white/20'}"
				onclick={() => (mode = 'markup', selectedScreenId = null, drawingArrow = null, selectedArrow = null)}
				aria-label="Mark up"
				aria-pressed={mode === 'markup'}
			>
				<Pencil class="size-4" />
			</button>
		</div>
		{#if mode === 'markup'}
			<div class="h-4 w-px bg-white/30" role="separator"></div>
			<div class="flex items-center gap-1">
				<button
					type="button"
					class="rounded-md p-2 transition-colors {markupDrawMode === 'draw'
						? 'bg-white/20 text-white'
						: 'text-white/80 hover:bg-white/20'}"
					onclick={() => (markupDrawMode = 'draw')}
					aria-label="Draw"
					aria-pressed={markupDrawMode === 'draw'}
				>
					<Pencil class="size-4" />
				</button>
				<button
					type="button"
					class="rounded-md p-2 transition-colors {markupDrawMode === 'erase'
						? 'bg-white/20 text-white'
						: 'text-white/80 hover:bg-white/20'}"
					onclick={() => (markupDrawMode = 'erase')}
					aria-label="Eraser"
					aria-pressed={markupDrawMode === 'erase'}
				>
					<Eraser class="size-4" />
				</button>
			</div>
			{#if markupDrawMode === 'draw'}
				<div class="flex items-center gap-1.5">
					{#each MARKUP_COLORS as color}
						<button
							type="button"
							class="size-7 rounded-full border-2 transition-all {markupColor === color.value
								? 'border-white scale-110'
								: 'border-transparent hover:scale-105'}"
							style="background-color: {color.value}"
							onclick={() => (markupColor = color.value)}
							aria-label={color.label}
							aria-pressed={markupColor === color.value}
						></button>
					{/each}
				</div>
				<div class="flex items-center gap-1">
					{#each MARKUP_WIDTHS as w}
						<button
							type="button"
							class="flex h-7 min-w-7 items-center justify-center rounded-md px-2 text-xs font-medium transition-colors {markupWidth === w
								? 'bg-white/30 text-white'
								: 'text-white/80 hover:bg-white/20'}"
							onclick={() => (markupWidth = w)}
							aria-label="Stroke width {w}"
							aria-pressed={markupWidth === w}
						>
							{w}
						</button>
					{/each}
				</div>
			{/if}
		{/if}
		<div class="h-4 w-px bg-white/30" role="separator"></div>
		{#if mode === 'select' && selectedArrow}
			<button
				type="button"
				class="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500/80"
				onclick={deleteSelectedArrow}
				aria-label="Delete selected arrow"
			>
				<Trash2 class="size-4" />
				Delete
			</button>
		{/if}
		<div class="h-4 w-px bg-white/30" role="separator"></div>
		<div class="flex items-center gap-2">
			<button
				type="button"
				class="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
				onclick={handleSave}
				aria-label="Save"
			>
				<Check class="size-4" />
				Save
			</button>
			<button
				type="button"
				class="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
				onclick={onCancel}
				aria-label="Cancel"
			>
				<X class="size-4" />
				Cancel
			</button>
		</div>
	</div>
</div>
