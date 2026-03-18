/** Map zoom level (0–100) to column width in px. 50 = 5 cols, 0 = more cols, 100 = fewer cols. */
const COL_5 = 160; /* 5 cols at 50% - wider to avoid sparse 6th column */
const COL_MIN = 100; /* more cols at 0% */
const COL_MAX = 400; /* fewer cols at 100% */

/** Returns column width in px. Zoom 50 = 140px (5 cols), 0 = 100px (more), 100 = 400px (fewer). */
export function getColumnWidthPx(zoom: number): number {
	const clamped = Math.max(0, Math.min(100, zoom));
	if (clamped <= 50) {
		return Math.round(COL_MIN + (COL_5 - COL_MIN) * (clamped / 50));
	}
	return Math.round(COL_5 + (COL_MAX - COL_5) * ((clamped - 50) / 50));
}
