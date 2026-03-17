/** Map zoom level (0–100) to Tailwind columns class. 0 = smallest (8 cols), 100 = biggest (2 cols). */
export const ZOOM_COLUMNS = [
	'columns-2',
	'columns-3',
	'columns-4',
	'columns-5',
	'columns-6',
	'columns-7',
	'columns-8'
] as const;

export function getZoomColumnsClass(zoom: number): string {
	const clamped = Math.max(0, Math.min(100, zoom));
	const index = Math.round((100 - clamped) * 6 / 100); // 0→6, 100→0
	return ZOOM_COLUMNS[Math.min(index, 6)];
}
