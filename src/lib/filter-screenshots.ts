/**
 * Filter screenshots by search query (fileName, note) and selected tag IDs.
 * Screenshot must match the search query and have ALL selected tags.
 */

export type ScreenshotWithTags = {
	id: number;
	fileName: string;
	note?: string | null;
	tags?: { id: number }[];
};

export function filterScreenshots<T extends ScreenshotWithTags>(
	screenshots: T[],
	searchQuery: string,
	selectedTagIds: number[]
): T[] {
	let result = screenshots;

	const q = searchQuery.trim().toLowerCase();
	if (q) {
		result = result.filter((s) => {
			const nameMatch = s.fileName.toLowerCase().includes(q);
			const noteMatch = s.note?.toLowerCase().includes(q);
			return nameMatch || noteMatch;
		});
	}

	if (selectedTagIds.length > 0) {
		const tagSet = new Set(selectedTagIds);
		result = result.filter((s) => {
			const screenshotTagIds = new Set((s.tags ?? []).map((t) => t.id));
			return selectedTagIds.every((id) => screenshotTagIds.has(id));
		});
	}

	return result;
}
