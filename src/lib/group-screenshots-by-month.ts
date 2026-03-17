/**
 * Group screenshots by upload month (createdAt). Returns sections ordered by month, newest first.
 */

export type ScreenshotWithCreatedAt = {
	createdAt: Date | string;
	[key: string]: unknown;
};

export type MonthSection<T> = {
	month: string;
	screenshots: T[];
};

export function groupScreenshotsByMonth<T extends ScreenshotWithCreatedAt>(
	screenshots: T[]
): MonthSection<T>[] {
	const byKey = new Map<string, T[]>();

	for (const shot of screenshots) {
		const d = typeof shot.createdAt === 'string' ? new Date(shot.createdAt) : shot.createdAt;
		const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
		const list = byKey.get(key) ?? [];
		list.push(shot);
		byKey.set(key, list);
	}

	const keys = [...byKey.keys()].sort((a, b) => b.localeCompare(a));

	return keys.map((key) => {
		const [year, month] = key.split('-');
		const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1);
		const monthLabel = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
		return { month: monthLabel, screenshots: byKey.get(key)! };
	});
}
