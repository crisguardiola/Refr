/** Data type used for drag-and-drop of screenshots between folders */
export const SCREENSHOT_DRAG_TYPE = 'application/x-refr-screenshot';

export type ScreenshotDragData = {
	screenshotId: number;
	tagIds: number[];
};

/**
 * Moves a screenshot to a folder (or uncategorised/trash).
 * @param screenshotId - The screenshot ID to move
 * @param target - 'uncategorised' | 'trash' | number (folder id)
 * @param tagIds - Current tag IDs to preserve when moving to a folder
 * @returns true if successful
 */
export async function moveScreenshot(
	screenshotId: number,
	target: 'uncategorised' | 'trash' | number,
	tagIds: number[] = []
): Promise<boolean> {
	try {
		if (target === 'trash') {
			const formData = new FormData();
			formData.append('id', String(screenshotId));
			const res = await fetch('/app?/moveToTrash', { method: 'POST', body: formData });
			const data = await res.json();
			return data?.success === true;
		}

		const formData = new FormData();
		formData.append('id', String(screenshotId));
		formData.append('folderId', target === 'uncategorised' ? '' : String(target));
		formData.append('tags', tagIds.join(','));
		const res = await fetch('/app/screenshot/update', { method: 'POST', body: formData });
		const data = await res.json();
		return data?.success === true;
	} catch {
		return false;
	}
}
