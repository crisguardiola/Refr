/**
 * Filter screenshots by search query (fileName, note), selected tag IDs, and rating.
 * Screenshot must match the search query, have ALL selected tags, and match the rating filter.
 */

export type ScreenshotWithTags = {
	id: number;
	fileName: string;
	note?: string | null;
	rating?: number | null;
	tags?: { id: number }[];
};

export function filterScreenshots<T extends ScreenshotWithTags>(
	screenshots: T[],
	searchQuery: string,
	selectedTagIds: number[],
	selectedRating: number | null = null
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

	if (selectedRating != null && selectedRating >= 1 && selectedRating <= 5) {
		result = result.filter((s) => s.rating === selectedRating);
	}

	return result;
}
