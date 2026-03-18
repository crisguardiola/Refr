<script lang="ts">
	import { ArrowRight, Check, Eraser, Hand, MousePointer, Pencil, Trash2, X } from '@lucide/svelte';
	import { cloudinaryUrl } from '$lib/cloudinary.js';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';

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
	let suppressHoverFor = $state<'hand' | 'arrow' | 'pencil' | 'eraser' | null>(null);

	function handleHandClick() {
		const wasActive = mode === 'move';
		mode = wasActive ? 'select' : 'move';
		suppressHoverFor = wasActive ? 'hand' : null;
		selectedScreenId = null;
		drawingArrow = null;
		selectedArrow = null;
		editingArrow = null;
	}
	function handleArrowClick() {
		const wasActive = mode === 'arrow';
		mode = wasActive ? 'select' : 'arrow';
		suppressHoverFor = wasActive ? 'arrow' : null;
		selectedScreenId = null;
		drawingArrow = null;
		selectedArrow = null;
		editingArrow = null;
	}
	function handlePencilClick() {
		const wasActive = mode === 'markup' && markupDrawMode === 'draw';
		if (wasActive) {
			mode = 'select';
			suppressHoverFor = 'pencil';
		} else {
			mode = 'markup';
			markupDrawMode = 'draw';
			suppressHoverFor = null;
		}
		selectedScreenId = null;
		drawingArrow = null;
		selectedArrow = null;
		editingArrow = null;
	}
	function handleEraserClick() {
		const wasActive = mode === 'markup' && markupDrawMode === 'erase';
		if (wasActive) {
			mode = 'select';
			suppressHoverFor = 'eraser';
		} else {
			mode = 'markup';
			markupDrawMode = 'erase';
			suppressHoverFor = null;
		}
		selectedScreenId = null;
		drawingArrow = null;
		selectedArrow = null;
		editingArrow = null;
	}
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
	let isPanning = $state(false);
	let panStart = $state<{ scrollLeft: number; scrollTop: number; clientX: number; clientY: number } | null>(null);
	let canvasRef: HTMLDivElement;
	let canvasScrollRef: HTMLDivElement;
	let zoomLevel = $state(1);
	let zoomOrigin = $state({ x: 0, y: 0 });

	// Arrow drawing: from selected screen (center→center) or free (point→point)
	let drawingArrow = $state<{ type: 'screen'; fromScreen: number } | { type: 'free'; fromX: number; fromY: number } | null>(null);
	let drawCurrent = $state<{ x: number; y: number } | null>(null);

	// Arrow editing (cursor mode): drag endpoints
	let editingArrow = $state<
		| { type: 'free'; index: number; end: 'from' | 'to' }
		| { type: 'screen'; index: number; end: 'from' | 'to' }
		| null
	>(null);
	let editStart = $state<{
		clientX: number;
		clientY: number;
		free?: { fromX: number; fromY: number; toX: number; toY: number };
		screen?: { from: number; to: number };
	} | null>(null);
	let editPreview = $state<{ x: number; y: number } | null>(null);

	const ARROW_HIT_THRESHOLD = 12;
	const ARROW_ENDPOINT_HIT_THRESHOLD = 18;
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
		return {
			x: (clientX - rect.left) / zoomLevel,
			y: (clientY - rect.top) / zoomLevel
		};
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

	/** Which endpoint of an arrow is closer to the click? Used for endpoint editing. */
	function hitTestArrowEnd(
		clientX: number,
		clientY: number
	): { type: 'screen'; index: number; end: 'from' | 'to' } | { type: 'free'; index: number; end: 'from' | 'to' } | null {
		const pt = clientToCanvas(clientX, clientY);
		if (!pt) return null;
		const hit = hitTestArrow(clientX, clientY);
		if (!hit) return null;
		if (hit.type === 'free') {
			const fa = freeArrows[hit.index];
			if (!fa) return null;
			const dFrom = Math.hypot(pt.x - fa.fromX, pt.y - fa.fromY);
			const dTo = Math.hypot(pt.x - fa.toX, pt.y - fa.toY);
			return { type: 'free', index: hit.index, end: dFrom <= dTo ? 'from' : 'to' };
		}
		// Screen arrow: compare distance to visual start vs tip
		const fromNode = getNodeById(arrows[hit.index].from);
		const toNode = getNodeById(arrows[hit.index].to);
		if (!fromNode || !toNode) return null;
		const fromC = getNodeCenter(fromNode);
		const toC = getNodeCenter(toNode);
		const dx = toC.x - fromC.x;
		const dy = toC.y - fromC.y;
		const len = Math.sqrt(dx * dx + dy * dy) || 1;
		const ux = dx / len;
		const uy = dy / len;
		const startX = fromC.x + ux * (fromNode.width / 2 + 4);
		const startY = fromC.y + uy * (fromNode.height / 2 + 4);
		const tipX = toC.x - ux * (toNode.width / 2 + 4);
		const tipY = toC.y - uy * (toNode.height / 2 + 4);
		const dFrom = Math.hypot(pt.x - startX, pt.y - startY);
		const dTo = Math.hypot(pt.x - tipX, pt.y - tipY);
		return { type: 'screen', index: hit.index, end: dFrom <= dTo ? 'from' : 'to' };
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
		if (mode === 'move' && canvasScrollRef) {
			// Hand: pan even when clicking on a screen
			isPanning = true;
			panStart = {
				scrollLeft: canvasScrollRef.scrollLeft,
				scrollTop: canvasScrollRef.scrollTop,
				clientX: e.clientX,
				clientY: e.clientY
			};
			return;
		}
		if (mode === 'arrow') {
			if (drawingArrow) return; // already drawing
			// Click on screen: select and start drawing immediately (one action)
			selectedScreenId = nodeId;
			drawingArrow = { type: 'screen', fromScreen: nodeId };
			drawCurrent = clientToCanvas(e.clientX, e.clientY);
		} else if (mode === 'select' && canvasRef) {
			// Cursor: select and move screens
			selectedArrow = null;
			const pt = clientToCanvas(e.clientX, e.clientY);
			if (pt) {
				draggingId = nodeId;
				dragOffset = { x: pt.x - node.x, y: pt.y - node.y };
			}
		}
	}

	function handleCanvasWheel(e: WheelEvent) {
		if (!canvasRef) return;
		e.preventDefault();
		const rect = canvasRef.getBoundingClientRect();
		const cursorX = (e.clientX - rect.left) / zoomLevel;
		const cursorY = (e.clientY - rect.top) / zoomLevel;
		zoomOrigin = { x: cursorX, y: cursorY };
		const delta = -Math.sign(e.deltaY) * 0.15;
		zoomLevel = Math.max(0.25, Math.min(2, zoomLevel * (1 + delta)));
	}

	function canvasWheelAction(node: HTMLDivElement) {
		const handler = (e: WheelEvent) => handleCanvasWheel(e);
		node.addEventListener('wheel', handler, { passive: false });
		return {
			destroy() {
				node.removeEventListener('wheel', handler);
			}
		};
	}

	function handleCanvasPointerDown(e: PointerEvent) {
		const target = e.target as HTMLElement;
		if (target.closest('img')) return; // hit a screen, let it handle
		const pt = clientToCanvas(e.clientX, e.clientY);
		if (!pt) return;
		if (mode === 'move' && canvasScrollRef) {
			// Hand: pan the canvas
			isPanning = true;
			panStart = {
				scrollLeft: canvasScrollRef.scrollLeft,
				scrollTop: canvasScrollRef.scrollTop,
				clientX: e.clientX,
				clientY: e.clientY
			};
			return;
		}
		if (mode === 'select') {
			const hit = hitTestArrow(e.clientX, e.clientY);
			const endHit = hit ? hitTestArrowEnd(e.clientX, e.clientY) : null;
			const isSelected = selectedArrow && hit && selectedArrow.type === hit.type && selectedArrow.index === hit.index;
			if (hit && endHit && isSelected) {
				if (endHit.type === 'free') {
					const fa = freeArrows[endHit.index];
					if (fa) {
						editingArrow = { type: 'free', index: endHit.index, end: endHit.end };
						editStart = {
							clientX: e.clientX,
							clientY: e.clientY,
							free: { fromX: fa.fromX, fromY: fa.fromY, toX: fa.toX, toY: fa.toY }
						};
						editPreview = null;
					}
				} else {
					const arr = arrows[endHit.index];
					if (arr && pt) {
						editingArrow = { type: 'screen', index: endHit.index, end: endHit.end };
						editStart = {
							clientX: e.clientX,
							clientY: e.clientY,
							screen: { from: arr.from, to: arr.to }
						};
						editPreview = pt;
					}
				}
			} else {
				selectedArrow = hit;
			}
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
		if (isPanning && panStart && canvasScrollRef) {
			const dx = e.clientX - panStart.clientX;
			const dy = e.clientY - panStart.clientY;
			canvasScrollRef.scrollLeft = panStart.scrollLeft - dx;
			canvasScrollRef.scrollTop = panStart.scrollTop - dy;
			return;
		}
		if (editingArrow && editStart && pt) {
			if (editingArrow.type === 'free' && editStart.free) {
				const fa = editStart.free;
				if (editingArrow.end === 'from') {
					freeArrows = freeArrows.map((a, i) =>
						i === editingArrow.index ? { ...a, fromX: pt.x, fromY: pt.y } : a
					);
				} else {
					freeArrows = freeArrows.map((a, i) =>
						i === editingArrow.index ? { ...a, toX: pt.x, toY: pt.y } : a
					);
				}
			} else if (editingArrow.type === 'screen') {
				editPreview = pt;
			}
			return;
		}
		editPreview = null;
		if (draggingId === null || !pt) return;
		const node = getNodeById(draggingId);
		if (!node) return;
		nodes = nodes.map((n) =>
			n.id === draggingId
				? {
						...n,
						x: Math.max(0, pt.x - dragOffset.x),
						y: Math.max(0, pt.y - dragOffset.y)
					}
				: n
		);
	}

	function handlePointerUp(e: PointerEvent) {
		if (isPanning) {
			isPanning = false;
			panStart = null;
			return;
		}
		if (editingArrow) {
			if (editingArrow.type === 'screen' && editStart?.screen) {
				const hitNode = hitTestNode(e.clientX, e.clientY);
				const otherScreen = editingArrow.end === 'from' ? editStart.screen.to : editStart.screen.from;
				if (hitNode && hitNode !== otherScreen) {
					const arr = arrows[editingArrow.index];
					if (arr) {
						arrows = arrows.map((a, i) =>
							i === editingArrow!.index
								? editingArrow!.end === 'from'
									? { ...a, from: hitNode }
									: { ...a, to: hitNode }
								: a
						);
					}
				}
			}
			editingArrow = null;
			editStart = null;
			editPreview = null;
			return;
		}
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
		if (!canvasRef || !markupCanvasRef || (mode !== 'markup' && canvasMarkupStrokes.length === 0)) return;
		redrawMarkupCanvas();
		const ro = new ResizeObserver(redrawMarkupCanvas);
		ro.observe(canvasRef);
		return () => ro.disconnect();
	});

	$effect(() => {
		canvasMarkupStrokes;
		markupCurrentStroke;
		if (markupCanvasRef && (mode === 'markup' || canvasMarkupStrokes.length > 0)) redrawMarkupCanvas();
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
		const target = e.target as HTMLElement;
		if (target.closest('input, textarea, [contenteditable]')) return;
		if (e.key === 'h' || e.key === 'H') {
			e.preventDefault();
			mode = 'move';
			selectedScreenId = null;
			drawingArrow = null;
			selectedArrow = null;
			editingArrow = null;
		}
		if (e.key === 'v' || e.key === 'V') {
			e.preventDefault();
			mode = 'select';
			selectedScreenId = null;
			drawingArrow = null;
			editingArrow = null;
		}
		if (e.key === 'a' || e.key === 'A') {
			e.preventDefault();
			mode = 'arrow';
			selectedScreenId = null;
			drawingArrow = null;
			selectedArrow = null;
			editingArrow = null;
		}
		if (e.key === 'm' || e.key === 'M') {
			e.preventDefault();
			mode = 'markup';
			markupDrawMode = 'draw';
			selectedScreenId = null;
			drawingArrow = null;
			selectedArrow = null;
			editingArrow = null;
		}
		if (e.key === 'e' || e.key === 'E') {
			e.preventDefault();
			mode = 'markup';
			markupDrawMode = 'erase';
			selectedScreenId = null;
			drawingArrow = null;
			selectedArrow = null;
			editingArrow = null;
		}
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
	<div
		bind:this={canvasScrollRef}
		class="relative min-h-0 flex-1 overflow-auto bg-background flow-canvas-dots"
		role="region"
		aria-label="Flow canvas"
		use:canvasWheelAction
	>
		<div
			bind:this={canvasRef}
			class="relative min-h-[600px] min-w-[800px] origin-top-left p-8 transition-none {mode === 'move'
				? 'cursor-grab active:cursor-grabbing'
				: mode === 'arrow' && !drawingArrow
					? 'cursor-crosshair'
					: mode === 'select'
						? 'cursor-default'
						: mode === 'markup'
							? 'cursor-crosshair'
							: ''}"
			style="transform: scale({zoomLevel}); transform-origin: {zoomOrigin.x}px {zoomOrigin.y}px;"
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
					{@const isBeingEdited = editingArrow?.type === 'screen' && editingArrow.index === i}
					{@const fromNode = getNodeById(arrow.from)}
					{@const toNode = getNodeById(arrow.to)}
					{@const isSelected = selectedArrow?.type === 'screen' && selectedArrow?.index === i}
					{#if fromNode && toNode && !isBeingEdited}
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
						{#if isSelected}
							<circle cx={startX} cy={startY} r="6" fill="white" stroke="var(--primary)" stroke-width="2" />
							<circle cx={tipX} cy={tipY} r="6" fill="white" stroke="var(--primary)" stroke-width="2" />
						{/if}
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
					{#if isSelected}
						<circle cx={fa.fromX} cy={fa.fromY} r="6" fill="white" stroke="var(--primary)" stroke-width="2" />
						<circle cx={fa.toX} cy={fa.toY} r="6" fill="white" stroke="var(--primary)" stroke-width="2" />
					{/if}
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
							{@const startX = fromC.x + ux * (fromNode.width / 2 + 4)}
							{@const startY = fromC.y + uy * (fromNode.height / 2 + 4)}
							<!-- Anchor dot at screen edge (linked to screenshot) -->
							<circle cx={startX} cy={startY} r="6" fill="none" stroke="var(--primary)" stroke-width="2.5" opacity="1" />
							<!-- Screen-linked arrow: solid line, thicker, full opacity -->
							<line
								x1={startX}
								y1={startY}
								x2={drawCurrent.x}
								y2={drawCurrent.y}
								stroke="var(--primary)"
								stroke-width="4"
								opacity="1"
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
				<!-- Preview while editing screen arrow endpoint -->
				{#if editingArrow?.type === 'screen' && editPreview && editStart?.screen}
					{@const fixedScreenId = editingArrow.end === 'from' ? editStart.screen.to : editStart.screen.from}
					{@const fixedNode = getNodeById(fixedScreenId)}
					{#if fixedNode}
						{@const fixedC = getNodeCenter(fixedNode)}
						{@const dx = editPreview.x - fixedC.x}
						{@const dy = editPreview.y - fixedC.y}
						{@const len = Math.sqrt(dx * dx + dy * dy) || 1}
						{@const ux = dx / len}
						{@const uy = dy / len}
						{@const startX = fixedC.x + ux * (fixedNode.width / 2 + 4)}
						{@const startY = fixedC.y + uy * (fixedNode.height / 2 + 4)}
						<line
							x1={startX}
							y1={startY}
							x2={editPreview.x}
							y2={editPreview.y}
							stroke="white"
							stroke-width="4"
							opacity="0.9"
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
						class="absolute block max-w-[400px] max-h-[400px] w-auto h-auto object-contain transition-shadow {mode === 'select'
							? (draggingId === node.id ? 'cursor-grabbing' : 'cursor-default')
							: 'cursor-crosshair'}
						hover:shadow-lg {(selectedScreenId === node.id ||
							(drawingArrow?.type === 'screen' && drawingArrow.fromScreen === node.id) ||
							arrows.some((a) => a.from === node.id))
							? 'ring-2 ring-primary ring-offset-2 shadow-lg shadow-primary/40'
							: ''}
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

			<!-- Canvas-level markup overlay - always visible when there are strokes, interactive in markup mode -->
			{#if mode === 'markup' || canvasMarkupStrokes.length > 0}
				<canvas
					bind:this={markupCanvasRef}
					class="absolute inset-0 z-10 touch-none {mode !== 'markup'
						? 'pointer-events-none'
						: markupDrawMode === 'erase'
							? 'cursor-cell'
							: 'cursor-crosshair'}"
					style="left: 0; top: 0; width: 100%; height: 100%;"
					onpointerdown={handleMarkupPointerDown}
					onpointerleave={handleMarkupPointerUp}
					onpointercancel={handleMarkupPointerUp}
					aria-label="Markup canvas"
				></canvas>
			{/if}
		</div>
	</div>

	<!-- Settings bar (colors, strokes) - above main toolbar, markup mode only -->
	{#if mode === 'markup' && markupDrawMode === 'draw'}
		<div
			class="absolute bottom-20 left-1/2 z-20 flex -translate-x-1/2 flex-nowrap items-center gap-4 rounded-lg bg-black/60 px-4 py-2.5"
			role="toolbar"
			aria-label="Markup settings"
		>
			<div class="flex items-center gap-1.5">
				<span class="text-xs text-white/60">Color</span>
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
			<div class="h-4 w-px bg-white/30" role="separator"></div>
			<div class="flex items-center gap-1.5">
				<span class="text-xs text-white/60">Size</span>
				{#each MARKUP_WIDTHS as w}
					<button
						type="button"
						class="flex h-7 min-w-7 items-center justify-center rounded-md px-2 text-xs font-medium transition-colors {markupWidth === w
							? 'bg-primary text-primary-foreground'
							: 'text-white/70 hover:bg-white/10 hover:text-white/90'}"
						onclick={() => (markupWidth = w)}
						aria-label="Stroke width {w}"
						aria-pressed={markupWidth === w}
					>
						{w}
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Bottom toolbar -->
	<Tooltip.Provider delayDuration={600}>
		<div
			class="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 flex-nowrap items-center gap-3 rounded-lg bg-black/60 px-4 py-3"
			role="toolbar"
		>
			<div class="flex flex-nowrap items-center gap-2">
				<Tooltip.Root>
					<Tooltip.Trigger>
						<button
							type="button"
							class="rounded-md p-2 transition-colors {mode === 'select'
								? 'bg-primary text-primary-foreground'
								: 'text-white/70 hover:bg-white/10 hover:text-white/90'}"
							onclick={() => (mode = 'select', suppressHoverFor = null, selectedScreenId = null, drawingArrow = null, editingArrow = null)}
							aria-label="Select arrows"
							aria-pressed={mode === 'select'}
						>
							<MousePointer class="size-4" />
						</button>
					</Tooltip.Trigger>
					<Tooltip.Content side="top" class="z-[10000] bg-black/95 text-white border border-white/10 shadow-lg [&_kbd]:bg-white/20 [&_kbd]:text-white" arrowClasses="!bg-black/95">
						Select Tool <kbd class="ml-1 rounded px-1.5 py-0.5 font-mono text-[10px]">V</kbd>
					</Tooltip.Content>
				</Tooltip.Root>
				<Tooltip.Root>
					<Tooltip.Trigger>
						<button
							type="button"
							class="rounded-md p-2 transition-colors {mode === 'move'
								? 'bg-primary text-primary-foreground'
								: 'text-white/70 hover:bg-white/10 hover:text-white/90'} {suppressHoverFor === 'hand'
								? '[&.suppress-hover]:hover:!bg-transparent [&.suppress-hover]:hover:!text-white/70'
								: ''}"
							class:suppress-hover={suppressHoverFor === 'hand'}
							onclick={handleHandClick}
							onpointerleave={() => (suppressHoverFor = suppressHoverFor === 'hand' ? null : suppressHoverFor)}
							aria-label="Move screens"
							aria-pressed={mode === 'move'}
						>
							<Hand class="size-4" />
						</button>
					</Tooltip.Trigger>
					<Tooltip.Content side="top" class="z-[10000] bg-black/95 text-white border border-white/10 shadow-lg [&_kbd]:bg-white/20 [&_kbd]:text-white" arrowClasses="!bg-black/95">
						Hand Tool <kbd class="ml-1 rounded px-1.5 py-0.5 font-mono text-[10px]">H</kbd>
					</Tooltip.Content>
				</Tooltip.Root>
			</div>
			<div class="h-4 w-px bg-white/30" role="separator"></div>
			<div class="flex items-center gap-2">
				<Tooltip.Root>
					<Tooltip.Trigger>
						<button
							type="button"
							class="rounded-md p-2 transition-colors {mode === 'arrow'
								? 'bg-primary text-primary-foreground'
								: 'text-white/70 hover:bg-white/10 hover:text-white/90'} {suppressHoverFor === 'arrow'
								? '[&.suppress-hover]:hover:!bg-transparent [&.suppress-hover]:hover:!text-white/70'
								: ''}"
							class:suppress-hover={suppressHoverFor === 'arrow'}
							onclick={handleArrowClick}
							onpointerleave={() => (suppressHoverFor = suppressHoverFor === 'arrow' ? null : suppressHoverFor)}
							aria-label="Add arrow"
							aria-pressed={mode === 'arrow'}
						>
							<ArrowRight class="size-4" />
						</button>
					</Tooltip.Trigger>
					<Tooltip.Content side="top" class="z-[10000] bg-black/95 text-white border border-white/10 shadow-lg [&_kbd]:bg-white/20 [&_kbd]:text-white" arrowClasses="!bg-black/95">
						Arrow <kbd class="ml-1 rounded px-1.5 py-0.5 font-mono text-[10px]">A</kbd>
					</Tooltip.Content>
				</Tooltip.Root>
				<Tooltip.Root>
					<Tooltip.Trigger>
						<button
							type="button"
							class="rounded-md p-2 transition-colors {mode === 'markup' && markupDrawMode === 'draw'
								? 'bg-primary text-primary-foreground'
								: 'text-white/70 hover:bg-white/10 hover:text-white/90'} {suppressHoverFor === 'pencil'
								? '[&.suppress-hover]:hover:!bg-transparent [&.suppress-hover]:hover:!text-white/70'
								: ''}"
							class:suppress-hover={suppressHoverFor === 'pencil'}
							onclick={handlePencilClick}
							onpointerleave={() => (suppressHoverFor = suppressHoverFor === 'pencil' ? null : suppressHoverFor)}
							aria-label="Mark up"
							aria-pressed={mode === 'markup' && markupDrawMode === 'draw'}
						>
							<Pencil class="size-4" />
						</button>
					</Tooltip.Trigger>
					<Tooltip.Content side="top" class="z-[10000] bg-black/95 text-white border border-white/10 shadow-lg [&_kbd]:bg-white/20 [&_kbd]:text-white" arrowClasses="!bg-black/95">
						Marker <kbd class="ml-1 rounded px-1.5 py-0.5 font-mono text-[10px]">M</kbd>
					</Tooltip.Content>
				</Tooltip.Root>
				<Tooltip.Root>
					<Tooltip.Trigger>
						<button
							type="button"
							class="rounded-md p-2 transition-colors {mode === 'markup' && markupDrawMode === 'erase'
								? 'bg-primary text-primary-foreground'
								: 'text-white/70 hover:bg-white/10 hover:text-white/90'} {suppressHoverFor === 'eraser'
								? '[&.suppress-hover]:hover:!bg-transparent [&.suppress-hover]:hover:!text-white/70'
								: ''}"
							class:suppress-hover={suppressHoverFor === 'eraser'}
							onclick={handleEraserClick}
							onpointerleave={() => (suppressHoverFor = suppressHoverFor === 'eraser' ? null : suppressHoverFor)}
							aria-label="Eraser"
							aria-pressed={mode === 'markup' && markupDrawMode === 'erase'}
						>
							<Eraser class="size-4" />
						</button>
					</Tooltip.Trigger>
					<Tooltip.Content side="top" class="z-[10000] bg-black/95 text-white border border-white/10 shadow-lg [&_kbd]:bg-white/20 [&_kbd]:text-white" arrowClasses="!bg-black/95">
						Eraser <kbd class="ml-1 rounded px-1.5 py-0.5 font-mono text-[10px]">E</kbd>
					</Tooltip.Content>
				</Tooltip.Root>
			</div>
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
			<div class="h-4 w-px bg-white/30" role="separator"></div>
		{/if}
		<div class="flex items-center gap-2">
			<button
				type="button"
				class="flex items-center gap-2 rounded-md border border-white/30 bg-white/10 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-white/20"
				onclick={handleSave}
				aria-label="Save"
			>
				<Check class="size-4" />
				Save
			</button>
			<button
				type="button"
				class="flex items-center gap-2 rounded-md border border-white/30 bg-transparent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
				onclick={onCancel}
				aria-label="Cancel"
			>
				<X class="size-4" />
				Cancel
			</button>
		</div>
	</div>
	</Tooltip.Provider>
</div>
