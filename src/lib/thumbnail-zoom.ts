/** Map zoom level (0–100) to column width in px. 0 = narrow (5 cols), 100 = wide (few cols). */
const COL_MIN = 140;
const COL_MAX = 400;

/** Returns column width in px. Zoom 0 = 140px (~5 cols), 100 = 400px (few cols). */
export function getColumnWidthPx(zoom: number): number {
	const clamped = Math.max(0, Math.min(100, zoom));
	return Math.round(COL_MIN + (COL_MAX - COL_MIN) * (clamped / 100));
}
