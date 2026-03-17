/**
 * Filter screenshots by search query (fileName, note, UI element labels), selected tag IDs, and favourites.
 * Screenshot must match the search query, have ALL selected tags, and match the favourites filter.
 */

export type ScreenshotWithTags = {
	id: number;
	fileName: string;
	note?: string | null;
	favourite?: boolean;
	tags?: { id: number; label?: string }[];
};

export function filterScreenshots<T extends ScreenshotWithTags>(
	screenshots: T[],
	searchQuery: string,
	selectedTagIds: number[],
	favouritesOnly: boolean = false
): T[] {
	let result = screenshots;

	const q = searchQuery.trim().toLowerCase();
	if (q) {
		result = result.filter((s) => {
			const nameMatch = s.fileName.toLowerCase().includes(q);
			const noteMatch = s.note?.toLowerCase().includes(q);
			const tagMatch = (s.tags ?? []).some(
				(t) => 'label' in t && typeof t.label === 'string' && t.label.toLowerCase().includes(q)
			);
			return nameMatch || noteMatch || tagMatch;
		});
	}

	if (selectedTagIds.length > 0) {
		const tagSet = new Set(selectedTagIds);
		result = result.filter((s) => {
			const screenshotTagIds = new Set((s.tags ?? []).map((t) => t.id));
			return selectedTagIds.every((id) => screenshotTagIds.has(id));
		});
	}

	if (favouritesOnly) {
		result = result.filter((s) => s.favourite === true);
	}

	return result;
}
